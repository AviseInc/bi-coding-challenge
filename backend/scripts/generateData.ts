/**
 * Data Generation Script for Business Intelligence Application
 *
 * This script generates a comprehensive set of realistic test data for the application database.
 * It creates a complete accounting ecosystem with organizations, companies, users, accounts,
 * financial periods, journal entries, and related business entities following proper accounting
 * principles and data relationships.
 *
 * Key features:
 * - Creates organizations with hierarchical company structures
 * - Generates users with appropriate permissions and statuses (admins, regular users)
 * - Builds a chart of accounts following GAAP accounting principles:
 *   - Proper account classifications (Asset, Liability, Equity, Income, Expense)
 *   - Hierarchical account types and subtypes
 *   - Parent-child account relationships
 * - Creates fiscal periods based on company settings:
 *   - Monthly or quarterly periods based on company's BasePeriod setting
 *   - Automatically sets periods as closed for past, open for current/future
 *   - Sets target close dates to the nearest business day 1 week before period end
 * - Generates journal entries with chronologically increasing IDs
 *   - Journal entries have appropriate statuses based on period dates
 *   - Contains journal lines with balanced amounts (debits = credits)
 * - Creates supplementary business data:
 *   - Dimensions and dimension values for data categorization
 *   - Vendors and customers derived from dimension values
 *   - Tasks with appropriate assignments and statuses
 * - Features flexible configuration options:
 *   - JSON output mode for inspection without database writes
 *   - Configurable data volume (organizations, companies, accounts, etc.)
 *   - Customizable date ranges for fiscal periods
 *
 * Usage:
 *   pnpm generate-data [options]
 *   
 * Options:
 *   --json         Output data as JSON instead of writing to database
 *   --orgs         Number of organizations to create
 *   --companies    Number of companies per organization
 *   --users        Min and max users per company (format: "min,max")
 *   --accounts     Min and max accounts per company (format: "min,max")
 *   --entries      Min and max journal entries per period (format: "min,max")
 *   --fiscalYears  Start and end years for periods (format: "startYear,endYear")
 *   --help         Show help information
 *
 * @packageDocumentation
 */

import { faker } from "@faker-js/faker";
import { DateTime } from "luxon";
import _ from "lodash";
import { createId } from "@paralleldrive/cuid2";
import yargs from "yargs";
import logger from "../src/libraries/logger";
import {
  Account,
  AccountClassification,
  AccountSubType,
  AccountType,
  BasePeriod,
  Company,
  CurrencyCode,
  Customer,
  Dimension,
  DimensionSource,
  DimensionValue,
  EntryType,
  Frequency,
  JournalEntry,
  JournalEntryStatus,
  JournalLine,
  JournalLineDimension,
  Organization,
  Period,
  PeriodStatus,
  Platform,
  Task,
  TaskStatus,
  TaskType,
  User,
  UserStatus,
  Vendor,
} from "@prisma/client";

// Create a wrapped version of prisma that only gets initialized when needed
let prismaInstance: any = null;

const prisma = new Proxy({} as any, {
  get(target, prop) {
    if (!prismaInstance) {
      // Import and initialize prisma when first used
      logger.info("Initializing Prisma client");
      prismaInstance = require("../src/libraries/prisma").default;
    }
    return prismaInstance[prop];
  },
});

/**
 * Script to generate fake data for the database
 * Run with: pnpm exec ts-node scripts/generateData.ts
 * Or use the package script: pnpm generate-data
 */

// Configuration for the amount of fake data to generate
const NUM_ORGANIZATIONS = 3;
const NUM_COMPANIES_PER_ORG = 5;
const MIN_USERS_PER_COMPANY = 1;
const MAX_USERS_PER_COMPANY = 10;
const MIN_ACCOUNTS_PER_COMPANY = 6; // At least 6 accounts per company
const MAX_ACCOUNTS_PER_COMPANY = 24; // Maximum 24 accounts per company
const MIN_JOURNAL_ENTRIES_PER_PERIOD = 20; // At least 20 journal entries per period
const MAX_JOURNAL_ENTRIES_PER_PERIOD = 50; // Maximum 50 journal entries per period
const MAX_JOURNAL_LINES_PER_ENTRY = 5; // Maximum 5 journal lines per entry

/**
 * Generate an ID from a name
 * Removes special characters, converts to kebab case
 * Used for both organization and company IDs
 */
function generateIdFromName(name: string): string {
  // Trim whitespace, convert to lowercase
  const trimmed = _.trim(name).toLowerCase();

  // Remove special characters, keeping only alphanumeric and spaces
  const alphanumericOnly = trimmed.replace(/[^a-z0-9\s]/g, "");

  // Convert to kebab case (replace spaces with hyphens)
  return _.kebabCase(alphanumericOnly);
}

/**
 * Creates a random organization
 * Note: Does not write to database directly, data is batched in createOrganizations function
 */
function createRandomOrganization(): Organization {
  // Generate organization name
  const fullName = faker.company.name();

  // Generate ID from the full name
  const id = generateIdFromName(fullName);

  // Use the current time in UTC for timestamps
  const now = DateTime.utc();

  // Create organization data
  const organization = {
    id,
    fullName,
    createdAt: now.toJSDate(),
    updatedAt: now.toJSDate(),
  } as Organization;

  logger.debug(`Generated organization data: ${organization.fullName} (${organization.id})`);
  return organization;
}

/**
 * Creates multiple organizations
 */
async function createOrganizations(
  count: number,
  jsonMode: boolean = false,
): Promise<Organization[]> {
  logger.info(`Creating ${count} organizations...`);

  const organizations: Organization[] = [];

  // Generate data for all organizations
  for (let i = 0; i < count; i++) {
    // Use the createRandomOrganization function to generate data
    const organization = createRandomOrganization();
    organizations.push(organization);
  }

  // In JSON mode, just return the generated data
  if (jsonMode) {
    logger.info(`Generated data for ${organizations.length} organizations`);
    return organizations;
  }

  // In DB mode, use createMany to insert all organizations at once
  await prisma.organization.createMany({
    data: organizations,
    skipDuplicates: true,
  });

  logger.info(`Created ${organizations.length} organizations`);
  return organizations;
}

/**
 * Helper to get a random enum value
 * Works with both array of values and Record objects
 */
function randomEnum<T>(enumObject: T[] | Record<string, T>): T {
  let values: T[];

  if (Array.isArray(enumObject)) {
    values = enumObject;
  } else {
    values = Object.values(enumObject);
  }

  const randomIndex = Math.floor(Math.random() * values.length);

  return values[randomIndex];
}

/**
 * Creates a random company
 * Note: Does not write to database directly, data is batched in createCompanies function
 */
function createRandomCompany(organization: Organization): Company {
  // Generate company name
  const name = faker.company.name();

  // Generate ID from the company name (using same rules as org ID)
  const id = generateIdFromName(name);

  // Use the current time in UTC for timestamps
  const now = DateTime.utc();

  // Create company data
  const company = {
    id,
    name,
    timezone: faker.location.timeZone(),
    platform: randomEnum(Platform),
    createdAt: now.toJSDate(),
    updatedAt: now.toJSDate(),
    basePeriod: randomEnum(BasePeriod),
    fiscalYearStartMonth: faker.number.int({ min: 1, max: 12 }),
    fiscalYearStartDay: faker.number.int({ min: 1, max: 28 }),
    multiCurrencyEnabled: faker.datatype.boolean(),
    homeCurrency: randomEnum(CurrencyCode),
    organizationId: organization.id,
  } as Company;

  logger.debug(
    `Generated company data: ${company.name} (${company.id}) for organization: ${organization.fullName}`,
  );
  return company;
}

/**
 * Creates multiple companies for an organization
 */
async function createCompaniesForOrganization(
  organization: Organization,
  count: number,
): Promise<Company[]> {
  logger.info(`Creating ${count} companies for organization ${organization.fullName}...`);

  const companies: Company[] = [];

  for (let i = 0; i < count; i++) {
    const company = createRandomCompany(organization);
    companies.push(company);
  }

  return companies;
}

/**
 * Creates companies for all organizations
 */
async function createCompanies(
  organizations: Organization[],
  companiesPerOrg: number,
  jsonMode: boolean = false,
): Promise<Company[]> {
  logger.info(`Creating companies for ${organizations.length} organizations...`);

  const allCompanies: Company[] = [];

  for (const organization of organizations) {
    const companies = await createCompaniesForOrganization(organization, companiesPerOrg);
    allCompanies.push(...companies);
  }

  // In JSON mode, just return the generated data
  if (jsonMode) {
    logger.info(`Generated data for ${allCompanies.length} companies in total`);
    return allCompanies;
  }

  // In DB mode, use createMany to insert all companies at once
  await prisma.company.createMany({
    data: allCompanies,
    skipDuplicates: true,
  });

  logger.info(`Created ${allCompanies.length} companies in total`);
  return allCompanies;
}

/**
 * Creates a random user
 * Note: Does not write to database directly, data is batched in createUsers function
 */
function createRandomUser(company: Company, isAdmin: boolean = false): User {
  // Use the current time in UTC for timestamps
  const now = DateTime.utc();

  // If user is an admin, status must be Accepted
  const status = isAdmin ? UserStatus.Accepted : randomEnum(UserStatus);

  // Create user data
  const user = {
    id: createId(),
    companyId: company.id,
    email: faker.internet.email(),
    fullName: faker.person.fullName(),
    isAdmin: isAdmin,
    status: status,
    createdAt: now.toJSDate(),
    updatedAt: now.toJSDate(),
  } as User;

  logger.debug(
    `Generated user data: ${user.fullName} (${user.email}) for company: ${company.name} - Admin: ${user.isAdmin}, Status: ${user.status}`,
  );
  return user;
}

/**
 * Creates multiple users for a company
 */
async function createUsersForCompany(
  company: Company,
  minUsers: number,
  maxUsers: number,
): Promise<User[]> {
  // Determine a random number of users between min and max
  const numUsers = faker.number.int({
    min: minUsers,
    max: maxUsers,
  });

  logger.info(`Creating ${numUsers} users for company ${company.name}...`);

  const users: User[] = [];

  // Always create at least one admin user (first user)
  const adminUser = createRandomUser(company, true);
  users.push(adminUser);

  // Create remaining regular users
  for (let i = 1; i < numUsers; i++) {
    // Randomly decide if this user is an admin (small chance)
    const isAdmin = faker.datatype.boolean({ probability: 0.2 });
    const user = createRandomUser(company, isAdmin);
    users.push(user);
  }

  return users;
}

/**
 * Creates users for all companies
 */
async function createUsers(
  companies: Company[],
  minUsersPerCompany: number,
  maxUsersPerCompany: number,
  jsonMode: boolean = false,
): Promise<User[]> {
  logger.info(`Creating users for ${companies.length} companies...`);

  const allUsers: User[] = [];

  for (const company of companies) {
    const users = await createUsersForCompany(company, minUsersPerCompany, maxUsersPerCompany);
    allUsers.push(...users);
  }

  // In JSON mode, just return the generated data
  if (jsonMode) {
    logger.info(`Generated data for ${allUsers.length} users in total`);
    return allUsers;
  }

  // In DB mode, use createMany to insert all users at once
  await prisma.user.createMany({
    data: allUsers,
    skipDuplicates: true,
  });

  logger.info(`Created ${allUsers.length} users in total`);
  return allUsers;
}

/**
 * Get valid account types for a given account classification
 */
function getTypesForClassification(classification: AccountClassification): AccountType[] {
  switch (classification) {
    case AccountClassification.Asset:
      return [AccountType.CurrentAsset, AccountType.FixedAsset, AccountType.LongTermAsset];
    case AccountClassification.Liability:
      return [
        AccountType.CurrentLiability,
        AccountType.LongTermLiability,
        AccountType.ContingentLiability,
      ];
    case AccountClassification.Equity:
      return [AccountType.Capital, AccountType.RetainedProfit, AccountType.Reserve];
    case AccountClassification.Income:
      return [
        AccountType.OperatingRevenue,
        AccountType.NonOperatingRevenue,
        AccountType.GainOnSale,
      ];
    case AccountClassification.Expense:
      return [AccountType.DirectExpense, AccountType.IndirectExpense, AccountType.OperatingExpense];
    case AccountClassification.Unknown:
    default:
      return [AccountType.UncategorizedType];
  }
}

/**
 * Get valid account subtypes for a given account type
 */
function getSubtypesForType(accountType: AccountType): AccountSubType[] {
  switch (accountType) {
    // Asset Types
    case AccountType.CurrentAsset:
      return [
        AccountSubType.Cash,
        AccountSubType.AccountsReceivable,
        AccountSubType.Inventory,
        AccountSubType.PrepaidExpenses,
        AccountSubType.MarketableSecurities,
      ];
    case AccountType.FixedAsset:
      return [
        AccountSubType.Land,
        AccountSubType.Building,
        AccountSubType.Equipment,
        AccountSubType.Vehicles,
        AccountSubType.Furniture,
      ];
    case AccountType.LongTermAsset:
      return [
        AccountSubType.Investments,
        AccountSubType.Goodwill,
        AccountSubType.IntangibleAssets,
        AccountSubType.LongTermDeposits,
        AccountSubType.DeferredTaxAsset,
      ];

    // Liability Types
    case AccountType.CurrentLiability:
      return [
        AccountSubType.AccountsPayable,
        AccountSubType.ShortTermLoans,
        AccountSubType.AccruedLiabilities,
        AccountSubType.UnearnedRevenue,
        AccountSubType.CurrentPortionOfLTD,
      ];
    case AccountType.LongTermLiability:
      return [
        AccountSubType.LongTermDebt,
        AccountSubType.Bonds,
        AccountSubType.Mortgages,
        AccountSubType.PensionLiability,
        AccountSubType.DeferredTaxLiability,
      ];
    case AccountType.ContingentLiability:
      return [
        AccountSubType.LegalClaims,
        AccountSubType.ProductWarranties,
        AccountSubType.GuaranteeObligations,
        AccountSubType.EnvironmentalLiability,
      ];

    // Equity Types
    case AccountType.Capital:
      return [
        AccountSubType.CommonStock,
        AccountSubType.PreferredStock,
        AccountSubType.AdditionalPaidInCapital,
        AccountSubType.OwnerInvestment,
        AccountSubType.PartnerCapital,
      ];
    case AccountType.RetainedProfit:
      return [
        AccountSubType.RetainedEarnings,
        AccountSubType.AccumulatedProfits,
        AccountSubType.AccumulatedDeficit,
        AccountSubType.UndistributedProfit,
      ];
    case AccountType.Reserve:
      return [
        AccountSubType.GeneralReserve,
        AccountSubType.CapitalReserve,
        AccountSubType.StatutoryReserve,
        AccountSubType.RevaluationReserve,
        AccountSubType.TreasuryStock,
      ];

    // Income Types
    case AccountType.OperatingRevenue:
      return [
        AccountSubType.SalesRevenue,
        AccountSubType.ServiceRevenue,
        AccountSubType.CommissionRevenue,
        AccountSubType.FeeRevenue,
        AccountSubType.SubscriptionRevenue,
      ];
    case AccountType.NonOperatingRevenue:
      return [
        AccountSubType.InterestIncome,
        AccountSubType.DividendIncome,
        AccountSubType.RentalIncome,
        AccountSubType.RoyaltyIncome,
        AccountSubType.LicensingRevenue,
      ];
    case AccountType.GainOnSale:
      return [
        AccountSubType.GainOnSaleOfAssets,
        AccountSubType.GainOnInvestments,
        AccountSubType.GainOnDebtSettlement,
        AccountSubType.GainOnForeignExchange,
      ];

    // Expense Types
    case AccountType.DirectExpense:
      return [
        AccountSubType.CostOfGoodsSold,
        AccountSubType.DirectLabor,
        AccountSubType.DirectMaterials,
        AccountSubType.ManufacturingOverhead,
        AccountSubType.PurchasesDiscounts,
      ];
    case AccountType.IndirectExpense:
      return [
        AccountSubType.Salaries,
        AccountSubType.Rent,
        AccountSubType.Utilities,
        AccountSubType.OfficeSupplies,
        AccountSubType.Insurance,
      ];
    case AccountType.OperatingExpense:
      return [
        AccountSubType.Marketing,
        AccountSubType.ResearchAndDevelopment,
        AccountSubType.Depreciation,
        AccountSubType.Amortization,
        AccountSubType.Interest,
      ];

    // Unknown
    case AccountType.UncategorizedType:
    default:
      return [AccountSubType.Uncategorized];
  }
}

/**
 * Creates a random account
 * Note: Does not write to database directly, data is batched in createAccounts function
 */
function createRandomAccount(
  company: Company,
  classification: AccountClassification,
  parentAccount: {
    id: string;
    active: boolean;
    name: string;
    classification: AccountClassification;
    accountType: AccountType;
    accountSubType: AccountSubType;
  } | null = null,
) {
  // If this is a child account, use the same classification, type, and subtype as the parent
  let accountType: AccountType;
  let accountSubType: AccountSubType;

  if (parentAccount) {
    // Child accounts must match parent's classification, type, and subtype
    accountType = parentAccount.accountType;
    accountSubType = parentAccount.accountSubType;
  } else {
    // For new parent accounts, randomly select type and subtype from valid options
    const types = getTypesForClassification(classification);
    accountType = randomEnum(types);

    const subtypes = getSubtypesForType(accountType);
    accountSubType = randomEnum(subtypes);
  }

  // Generate fully qualified name
  let fullyQualifiedName = "";

  if (parentAccount) {
    // For child accounts, use the first word from parent name
    // then add a second random word, classification, type and subtype
    const parentFirstWord = parentAccount.name.split(" ")[0];
    const secondWord = faker.lorem.word({ length: { min: 5, max: 10 } });
    fullyQualifiedName = `${parentFirstWord} ${secondWord} ${classification}-${accountType}-${accountSubType}`;
  } else {
    // For parent accounts, start with a random long word
    const firstWord = faker.lorem.word({ length: { min: 10, max: 15 } });
    fullyQualifiedName = `${firstWord} ${classification}-${accountType}-${accountSubType}`;
  }

  // Sometimes shorten the name, sometimes use the full name
  let accountName = fullyQualifiedName;
  if (faker.datatype.boolean({ probability: 0.6 })) {
    // Shorten the name by removing some chars at the end
    const shortenBy = faker.number.int({ min: 3, max: 10 });
    accountName = fullyQualifiedName.substring(0, fullyQualifiedName.length - shortenBy);
  }

  // Generate active status - if parent exists and is not active, child must also be inactive
  let active = true;
  if (parentAccount && !parentAccount.active) {
    active = false;
  } else {
    active = faker.datatype.boolean({ probability: 0.9 }); // 90% chance of being active
  }

  // Special use type only applicable for Expense accounts
  const specialUseType =
    classification === AccountClassification.Expense && faker.datatype.boolean({ probability: 0.2 })
      ? ("AccruedExpense" as const)
      : null;

  // Use the current time in UTC for timestamps
  const now = DateTime.utc();

  // Create account data
  const account = {
    id: createId(),
    companyId: company.id,
    createdAt: now.toJSDate(),
    active: active,
    parentAccountId: parentAccount?.id ?? null,
    currency: company.homeCurrency,
    fullyQualifiedName: fullyQualifiedName,
    name: accountName,
    classification: classification,
    accountType: accountType,
    accountSubType: accountSubType,
    specialUseType: specialUseType,
  };

  const parentInfo = parentAccount ? ` (child of ${parentAccount.id})` : "";
  logger.debug(
    `Generated account data: ${account.name} (${account.id})${parentInfo} - Classification: ${account.classification}, Type: ${account.accountType}, SubType: ${account.accountSubType}, Active: ${account.active}`,
  );

  return account;
}

/**
 * Creates accounts for a company, ensuring at least one account per classification
 */
async function createAccountsForCompany(
  company: Company,
  minAccounts: number,
  maxAccounts: number,
) {
  // Determine number of accounts to create (between min and max)
  const numAccounts = faker.number.int({
    min: minAccounts,
    max: maxAccounts,
  });

  logger.info(`Creating ${numAccounts} accounts for company ${company.name}...`);

  const accounts = [];
  const parentAccounts = []; // Track potential parent accounts

  // First create at least one account for each classification
  for (const classification of Object.values(AccountClassification)) {
    const account = createRandomAccount(company, classification);
    accounts.push(account);
    parentAccounts.push(account);
  }

  // Create remaining accounts with random classifications
  for (let i = accounts.length; i < numAccounts; i++) {
    const classification = randomEnum(AccountClassification);

    // Randomly decide if this should be a child account (30% chance if we have parent accounts)
    const createChildAccount =
      parentAccounts.length > 0 && faker.datatype.boolean({ probability: 0.3 });

    if (createChildAccount) {
      // Find a potential parent with the same classification
      const potentialParents = parentAccounts.filter(
        (parent) => parent.classification === classification,
      );

      if (potentialParents.length > 0) {
        // Randomly select a parent
        const parentAccount = faker.helpers.arrayElement(potentialParents);

        // Create a child account with the same classification as the parent
        const childAccount = createRandomAccount(company, classification, parentAccount);

        accounts.push(childAccount);
        // Don't add child accounts to potential parents list
        continue;
      }
    }

    // Create a regular account
    const account = createRandomAccount(company, classification);
    accounts.push(account);
    parentAccounts.push(account);
  }

  logger.info(`Created ${accounts.length} accounts for company ${company.name}`);
  return accounts;
}

/**
 * Creates accounts for all companies
 */
async function createAccounts(
  companies: Company[],
  minAccountsPerCompany: number,
  maxAccountsPerCompany: number,
  jsonMode: boolean = false,
): Promise<Account[]> {
  logger.info(`Creating accounts for ${companies.length} companies...`);

  const allAccounts: Account[] = [];

  for (const company of companies) {
    const accounts = await createAccountsForCompany(
      company,
      minAccountsPerCompany,
      maxAccountsPerCompany,
    );
    allAccounts.push(...accounts);
  }

  // In JSON mode, just return the generated data
  if (jsonMode) {
    logger.info(`Generated data for ${allAccounts.length} accounts in total`);
    return allAccounts;
  }

  // In DB mode, use createMany to insert all accounts at once
  await prisma.account.createMany({
    data: allAccounts,
    skipDuplicates: true,
  });

  logger.info(`Created ${allAccounts.length} accounts in total`);
  return allAccounts;
}

/**
 * Helper function to find the nearest business day on or before a given date
 * Uses Luxon's isWeekend function to identify weekends
 */
function nearestPreviousBusinessDay(date: DateTime): DateTime {
  let currentDate = date.startOf("day");
  
  // Check if the current date is already a business day (not a weekend)
  if (!currentDate.isWeekend) {
    return currentDate;
  }
  
  // Keep going back one day at a time until we find a business day
  while (currentDate.isWeekend) {
    currentDate = currentDate.minus({ days: 1 });
  }
  
  return currentDate;
}

/**
 * Creates periods for a company based on its basePeriod setting (Month or Quarter)
 * Generates periods for the specified fiscal years
 * - Past periods are closed
 * - Current and future periods are open
 * - Target close date is set to the nearest business day one week before the end of the period
 */
function createPeriodsForCompany(company: Company, startYear: number, endYear: number) {
  logger.info(`Creating periods for company ${company.name} from ${startYear} to ${endYear}...`);

  const periods = [];
  const now = DateTime.utc();

  // Determine interval based on company's basePeriod
  const isMonthly = company.basePeriod === BasePeriod.Month;
  
  for (let year = startYear; year <= endYear; year++) {
    if (isMonthly) {
      // Create monthly periods (12 per year)
      for (let month = 1; month <= 12; month++) {
        // Create start and end dates for this month
        const startDate = DateTime.utc(year, month, 1).startOf("month");
        const endDate = startDate.endOf("month");
        
        // Calculate target close date (one week before end of period)
        const oneWeekBeforeEnd = endDate.minus({ days: 7 });
        
        // Find nearest business day on or before the one-week-before date
        const targetCloseDate = nearestPreviousBusinessDay(oneWeekBeforeEnd);

        // Determine if period should be closed or open (past periods are closed)
        const status = endDate < now ? PeriodStatus.closed : PeriodStatus.open;

        // Monthly display name (e.g., "Jan 2024")
        const displayName = `${startDate.toFormat("MMM")} ${year}`;

        // Convert Luxon DateTime to JavaScript Date objects that Prisma can handle
        const period = {
          id: createId(),
          companyId: company.id,
          displayName,
          startsOn: startDate.startOf("day").toJSDate(),
          endsOn: endDate.endOf("day").startOf("second").toJSDate(),
          targetClose: targetCloseDate.endOf("day").startOf("second").toJSDate(),
          status,
          createdAt: now.toJSDate(),
          updatedAt: now.toJSDate(),
        };

        periods.push(period);

        logger.debug(
          `Generated monthly period: ${period.displayName} (${period.id}) for company: ${company.name}, ` +
          `Status: ${period.status}, Target Close: ${targetCloseDate.toFormat("yyyy-MM-dd")} (Business day)`,
        );
      }
    } else {
      // Create quarterly periods (4 per year)
      for (let quarter = 1; quarter <= 4; quarter++) {
        // Calculate start and end months for this quarter
        const startMonth = (quarter - 1) * 3 + 1; // 1, 4, 7, 10
        const endMonth = startMonth + 2; // 3, 6, 9, 12
        
        // Create start and end dates for this quarter
        const startDate = DateTime.utc(year, startMonth, 1).startOf("month");
        const endDate = DateTime.utc(year, endMonth, 1).endOf("month");
        
        // Calculate target close date (one week before end of period)
        const oneWeekBeforeEnd = endDate.minus({ days: 7 });
        
        // Find nearest business day on or before the one-week-before date
        const targetCloseDate = nearestPreviousBusinessDay(oneWeekBeforeEnd);

        // Determine if period should be closed or open (past periods are closed)
        const status = endDate < now ? PeriodStatus.closed : PeriodStatus.open;

        // Quarterly display name (e.g., "Q1 2024")
        const displayName = `Q${quarter} ${year}`;

        // Convert Luxon DateTime to JavaScript Date objects that Prisma can handle
        const period = {
          id: createId(),
          companyId: company.id,
          displayName,
          startsOn: startDate.startOf("day").toJSDate(),
          endsOn: endDate.endOf("day").startOf("second").toJSDate(),
          targetClose: targetCloseDate.endOf("day").startOf("second").toJSDate(),
          status,
          createdAt: now.toJSDate(),
          updatedAt: now.toJSDate(),
        };

        periods.push(period);

        logger.debug(
          `Generated quarterly period: ${period.displayName} (${period.id}) for company: ${company.name}, ` +
          `Status: ${period.status}, Target Close: ${targetCloseDate.toFormat("yyyy-MM-dd")} (Business day)`,
        );
      }
    }
  }

  return periods;
}

/**
 * Creates periods for all companies
 */
async function createPeriods(
  companies: Company[],
  startYear: number,
  endYear: number,
  jsonMode: boolean = false,
): Promise<Period[]> {
  logger.info(
    `Creating periods for ${companies.length} companies from ${startYear} to ${endYear}...`,
  );

  const allPeriods: Period[] = [];

  for (const company of companies) {
    const periods = createPeriodsForCompany(company, startYear, endYear);
    allPeriods.push(...periods);
  }

  // In JSON mode, just return the generated data
  if (jsonMode) {
    logger.info(`Generated data for ${allPeriods.length} periods in total`);
    return allPeriods;
  }

  // In DB mode, use createMany to insert all periods at once
  await prisma.period.createMany({
    data: allPeriods,
    skipDuplicates: true,
  });

  logger.info(`Created ${allPeriods.length} periods in total`);
  return allPeriods;
}

/**
 * Creates standard dimensions for a company
 */
function createDimensionsForCompany(company: Company): Dimension[] {
  logger.info(`Creating standard dimensions for company ${company.name}...`);

  // Define standard dimension names
  const standardDimensions = [
    "Company",
    "Customer",
    "Vendor",
    "Department",
    "Location",
    "Product",
    "Person",
  ];

  const dimensions: Dimension[] = [];

  // Create a dimension for each standard name
  for (const dimensionName of standardDimensions) {
    // Pick a random source
    const source = randomEnum(DimensionSource);

    const dimension: Dimension = {
      id: createId(),
      companyId: company.id,
      name: dimensionName,
      active: true,
      source,
    };

    dimensions.push(dimension);
    logger.debug(
      `Generated dimension data: ${dimension.name} (${dimension.id}) for company: ${company.name}, Source: ${dimension.source}`,
    );
  }

  return dimensions;
}

/**
 * Creates random dimension values for a dimension
 */
function createDimensionValuesForDimension(dimension: Dimension): DimensionValue[] {
  // Determine how many dimension values to create (5-10)
  const numValues = faker.number.int({
    min: 5,
    max: 10,
  });

  logger.info(`Creating ${numValues} dimension values for dimension ${dimension.name}...`);

  const dimensionValues: DimensionValue[] = [];
  const valuesSet = new Set<string>(); // Track unique values

  // Try to generate the requested number of unique values (but don't loop forever)
  let attempts = 0;
  const maxAttempts = numValues * 3; // Allow 3x attempts to find enough unique values
  
  while (valuesSet.size < numValues && attempts < maxAttempts) {
    attempts++;
    let value: string;

    // Use specific faker functions based on dimension name
    switch (dimension.name) {
      case "Company":
        value = faker.company.name();
        break;

      case "Customer":
        value = faker.company.name();
        break;

      case "Vendor":
        value = faker.company.name();
        break;

      case "Department":
        value = faker.commerce.department();
        break;

      case "Location":
        value = `${faker.location.city()}, ${faker.location.state()}`;
        break;

      case "Product":
        value = faker.commerce.product();
        break;

      case "Person":
        value = faker.person.fullName();
        break;

      default:
        value = `${dimension.name} Value ${valuesSet.size + 1}`;
    }

    // Only add if this value is unique for this dimension
    if (!valuesSet.has(value)) {
      valuesSet.add(value);
      
      // Generate a description using faker
      const description = faker.lorem.sentence();

      const dimensionValue: DimensionValue = {
        id: createId(),
        companyId: dimension.companyId,
        dimensionId: dimension.id,
        dimensionName: dimension.name,
        value,
        description,
        active: true,
      };

      dimensionValues.push(dimensionValue);
      logger.debug(
        `Generated dimension value: ${dimensionValue.value} (${dimensionValue.id}) for dimension: ${dimension.name}`,
      );
    }
  }

  // Log if we couldn't generate the requested number of unique values
  if (dimensionValues.length < numValues) {
    logger.warn(
      `Only generated ${dimensionValues.length} unique values for dimension ${dimension.name} (requested ${numValues})`,
    );
  }

  return dimensionValues;
}

/**
 * Creates dimensions for all companies
 */
async function createDimensions(
  companies: Company[],
  jsonMode: boolean = false,
): Promise<Dimension[]> {
  logger.info(`Creating dimensions for ${companies.length} companies...`);

  const allDimensions: Dimension[] = [];

  for (const company of companies) {
    const dimensions = createDimensionsForCompany(company);
    allDimensions.push(...dimensions);
  }

  // In JSON mode, just return the generated data
  if (jsonMode) {
    logger.info(`Generated data for ${allDimensions.length} dimensions in total`);
    return allDimensions;
  }

  // In DB mode, use createMany to insert all dimensions at once
  await prisma.dimension.createMany({
    data: allDimensions,
    skipDuplicates: true,
  });

  logger.info(`Created ${allDimensions.length} dimensions in total`);
  return allDimensions;
}

/**
 * Creates dimension values for all dimensions
 */
async function createDimensionValues(
  dimensions: Dimension[],
  jsonMode: boolean = false,
): Promise<DimensionValue[]> {
  logger.info(`Creating dimension values for ${dimensions.length} dimensions...`);

  const allDimensionValues: DimensionValue[] = [];

  for (const dimension of dimensions) {
    const dimensionValues = createDimensionValuesForDimension(dimension);
    allDimensionValues.push(...dimensionValues);
  }

  // In JSON mode, just return the generated data
  if (jsonMode) {
    logger.info(`Generated data for ${allDimensionValues.length} dimension values in total`);
    return allDimensionValues;
  }

  // In DB mode, use createMany to insert all dimension values at once
  await prisma.dimensionValue.createMany({
    data: allDimensionValues,
    skipDuplicates: true,
  });

  logger.info(`Created ${allDimensionValues.length} dimension values in total`);
  return allDimensionValues;
}

/**
 * Creates vendors for each Vendor dimension value
 */
async function createVendorsFromDimensions(
  dimensionValues: DimensionValue[],
  jsonMode: boolean = false,
): Promise<Vendor[]> {
  logger.info(`Creating vendors from Vendor dimension values...`);

  // Filter for just Vendor dimension values
  const vendorDimensionValues = dimensionValues.filter(
    (dimValue) => dimValue.dimensionName === "Vendor",
  );

  logger.info(
    `Found ${vendorDimensionValues.length} Vendor dimension values to create vendors for`,
  );

  const vendors: Vendor[] = [];

  // Create a vendor for each Vendor dimension value
  for (const vendorDimValue of vendorDimensionValues) {
    const now = DateTime.utc();

    const vendor: Vendor = {
      id: createId(),
      companyId: vendorDimValue.companyId,
      displayName: vendorDimValue.value,
      active: vendorDimValue.active, // Match the active status from the dimension value
      createdAt: now.toJSDate(),
      updatedAt: now.toJSDate(),
    };

    vendors.push(vendor);
    logger.debug(
      `Generated vendor: ${vendor.displayName} (${vendor.id}) for company: ${vendor.companyId}, Active: ${vendor.active}`,
    );
  }

  // In JSON mode, just return the generated data
  if (jsonMode) {
    logger.info(`Generated data for ${vendors.length} vendors in total`);
    return vendors;
  }

  // In DB mode, use createMany to insert all vendors at once
  if (vendors.length > 0) {
    await prisma.vendor.createMany({
      data: vendors,
      skipDuplicates: true,
    });

    logger.info(`Created ${vendors.length} vendors in total`);
  } else {
    logger.info("No vendors created: no Vendor dimension values found");
  }

  return vendors;
}

/**
 * Creates customers for each Customer dimension value
 */
async function createCustomersFromDimensions(
  dimensionValues: DimensionValue[],
  jsonMode: boolean = false,
): Promise<Customer[]> {
  logger.info(`Creating customers from Customer dimension values...`);

  // Filter for just Customer dimension values
  const customerDimensionValues = dimensionValues.filter(
    (dimValue) => dimValue.dimensionName === "Customer",
  );

  logger.info(
    `Found ${customerDimensionValues.length} Customer dimension values to create customers for`,
  );

  const customers: Customer[] = [];

  // Create a customer for each Customer dimension value
  for (const customerDimValue of customerDimensionValues) {
    const now = DateTime.utc();

    const customer: Customer = {
      id: createId(),
      companyId: customerDimValue.companyId,
      displayName: customerDimValue.value,
      active: customerDimValue.active, // Match the active status from the dimension value
      createdAt: now.toJSDate(),
      updatedAt: now.toJSDate(),
    };

    customers.push(customer);
    logger.debug(
      `Generated customer: ${customer.displayName} (${customer.id}) for company: ${customer.companyId}, Active: ${customer.active}`,
    );
  }

  // In JSON mode, just return the generated data
  if (jsonMode) {
    logger.info(`Generated data for ${customers.length} customers in total`);
    return customers;
  }

  // In DB mode, use createMany to insert all customers at once
  if (customers.length > 0) {
    await prisma.customer.createMany({
      data: customers,
      skipDuplicates: true,
    });

    logger.info(`Created ${customers.length} customers in total`);
  } else {
    logger.info("No customers created: no Customer dimension values found");
  }

  return customers;
}

/**
 * Creates random tasks for a company
 */
function createRandomTasksForCompany(company: Company, users: User[]): Task[] {
  // Filter users for this company
  const companyUsers = users.filter((user) => user.companyId === company.id);

  // Determine number of tasks to create (10-100)
  const numTasks = faker.number.int({
    min: 10,
    max: 100,
  });

  logger.info(`Creating ${numTasks} tasks for company ${company.name}...`);

  const tasks: Task[] = [];

  for (let i = 0; i < numTasks; i++) {
    // Get random base timestamp for creation time
    const createdAt = faker.date.past({ years: 1 });

    // Every task must have an assignee
    const assignedTo = faker.helpers.arrayElement(companyUsers).id;

    // Generate random task status
    const status = randomEnum(TaskStatus);

    // Only add reviewer if status is 'reviewed'
    let reviewerId: string | null = null;
    if (status === TaskStatus.reviewed) {
      // Pick a different user than assignee as reviewer if possible
      const potentialReviewers = companyUsers.filter((user) => user.id !== assignedTo);
      if (potentialReviewers.length > 0) {
        reviewerId = faker.helpers.arrayElement(potentialReviewers).id;
      } else {
        // If no other users, can use same user as reviewer
        reviewerId = assignedTo;
      }
    }

    // Set task type
    const taskType = randomEnum(TaskType);

    // Set category only if task type is 'category'
    const category =
      taskType === TaskType.category
        ? faker.helpers.arrayElement(["Revenue", "Expenses", "Assets", "Liabilities", "Equity"])
        : null;

    // Set updatedAt based on status
    let updatedAt = createdAt;
    if (
      status === TaskStatus.in_progress ||
      status === TaskStatus.completed ||
      status === TaskStatus.reviewed
    ) {
      // For active/completed tasks, update time is after creation time
      updatedAt = faker.date.between({
        from: createdAt,
        to: new Date(),
      });
    }

    // Set completedOn only if status is completed or reviewed
    let completedOn: Date | null = null;
    if (status === TaskStatus.completed || status === TaskStatus.reviewed) {
      completedOn = faker.date.between({
        from: updatedAt,
        to: new Date(),
      });
    }

    // Set resolution only if status is 'reviewed'
    const resolution = status === TaskStatus.reviewed ? faker.lorem.paragraph() : null;

    // Set due date (must be after created date)
    const dueDate = faker.date.future({
      refDate: createdAt,
    });

    // Generate title (one sentence)
    const title = faker.lorem.sentence({ min: 3, max: 8 });

    // Generate description (1-3 sentences)
    const sentenceCount = faker.number.int({ min: 1, max: 3 });
    const description = faker.lorem.sentences(sentenceCount);

    // Randomly assign frequency for recurring tasks (30% chance)
    const frequency = faker.datatype.boolean({ probability: 0.3 }) ? randomEnum(Frequency) : null;

    // Create the task
    const task: Task = {
      id: createId(),
      companyId: company.id,
      title,
      description,
      createdAt,
      updatedAt,
      createdBy: faker.helpers.arrayElement(companyUsers).id,
      dueDate,
      frequency,
      status,
      resolution,
      assignedTo,
      reviewerId,
      category,
      completedOn,
      taskType,
    };

    tasks.push(task);
    logger.debug(
      `Generated task: ${task.title} (${task.id}) for company: ${company.id}, Status: ${task.status}, Type: ${task.taskType}`,
    );
  }

  return tasks;
}

/**
 * Creates tasks for all companies
 */
async function createTasks(
  companies: Company[],
  users: User[],
  jsonMode: boolean = false,
): Promise<Task[]> {
  logger.info(`Creating tasks for ${companies.length} companies...`);

  const allTasks: Task[] = [];

  for (const company of companies) {
    const tasks = createRandomTasksForCompany(company, users);
    allTasks.push(...tasks);
  }

  // In JSON mode, just return the generated data
  if (jsonMode) {
    logger.info(`Generated data for ${allTasks.length} tasks in total`);
    return allTasks;
  }

  // In DB mode, use createMany to insert all tasks at once
  if (allTasks.length > 0) {
    await prisma.task.createMany({
      data: allTasks,
      skipDuplicates: true,
    });

    logger.info(`Created ${allTasks.length} tasks in total`);
  }

  return allTasks;
}

/**
 * Creates random journal lines for a journal entry
 */
function createRandomJournalLines(journalEntry: JournalEntry, accounts: Account[]): JournalLine[] {
  // If status is Draft, it can have no journal lines
  if (
    journalEntry.status === JournalEntryStatus.Draft &&
    faker.datatype.boolean({ probability: 0.7 })
  ) {
    return [];
  }

  // Determine if we should check for active accounts only
  const now = DateTime.utc();

  const transactionDate = DateTime.fromJSDate(journalEntry.transactionDate);

  const requireActiveAccounts = transactionDate >= now;

  // Filter accounts for this company
  let availableAccounts = accounts.filter(
    (account) => account.companyId === journalEntry.companyId,
  );

  // For present and future dates, only use active accounts
  if (requireActiveAccounts) {
    availableAccounts = availableAccounts.filter((account) => account.active);
  }

  if (availableAccounts.length === 0) {
    logger.warn(
      `No suitable accounts found for company ${journalEntry.companyId}, skipping journal lines for entry ${journalEntry.id}`,
    );
    return [];
  }

  // Group accounts by classification to ensure diverse classifications
  const accountsByClassification = _.groupBy(availableAccounts, "classification");
  const classifications = Object.keys(accountsByClassification);

  // If no classifications exist, we can't create journal lines
  if (classifications.length === 0) {
    return [];
  }

  // Determine if we should create a single journal line with amount 0
  if (faker.datatype.boolean({ probability: 0.1 })) {
    // 10% chance to create a single line with zero amount
    const account = faker.helpers.arrayElement(availableAccounts);
    const journalLine: JournalLine = {
      id: createId(),
      companyId: journalEntry.companyId,
      journalEntryId: journalEntry.id,
      accountId: account.id,
      description: faker.lorem.sentence(),
      amount: 0,
    };

    return [journalLine];
  }

  // Determine number of journal lines (2-5 lines)
  const numLines = faker.number.int({
    min: 2,
    max: Math.min(
      MAX_JOURNAL_LINES_PER_ENTRY,
      classifications.length > 1 ? classifications.length : 5,
    ),
  });

  // Select different classifications if possible
  let selectedClassifications: string[] = [];

  // Try to get different classifications
  if (classifications.length > 1) {
    // Shuffle classifications
    const shuffledClassifications = _.shuffle(classifications);
    // Take as many as we need for the lines
    selectedClassifications = shuffledClassifications.slice(0, numLines);
  } else {
    // If only one classification, use it for all lines
    selectedClassifications = Array(numLines).fill(classifications[0]);
  }

  const journalLines: JournalLine[] = [];
  let totalAmount = 0;

  // Create n-1 journal lines with random amounts
  for (let i = 0; i < numLines - 1; i++) {
    // Try to use an account from a different classification
    const classification = selectedClassifications[i];
    const accountsForClassification = accountsByClassification[classification];
    const account = faker.helpers.arrayElement(accountsForClassification);

    // Generate a random amount between -500000000 and 500000000 (excluding 0)
    let amount = 0;
    while (amount === 0) {
      amount = faker.number.int({ min: -500000000, max: 500000000 });
    }

    totalAmount += amount;

    const journalLine: JournalLine = {
      id: createId(),
      companyId: journalEntry.companyId,
      journalEntryId: journalEntry.id,
      accountId: account.id,
      description: faker.lorem.sentence(),
      amount,
    };

    journalLines.push(journalLine);
  }

  // For the last line, try to use a different classification if possible
  const lastClassification = selectedClassifications[numLines - 1];
  const lastAccounts = accountsByClassification[lastClassification];
  const balancingAccount = faker.helpers.arrayElement(lastAccounts);

  const balancingLine: JournalLine = {
    id: createId(),
    companyId: journalEntry.companyId,
    journalEntryId: journalEntry.id,
    accountId: balancingAccount.id,
    description: faker.lorem.sentence(),
    amount: -totalAmount, // Negative of the sum to balance
  };

  journalLines.push(balancingLine);
  logger.info(
    `Generated ${journalLines.length} journal lines for journal entry ${journalEntry.id}`,
  );

  return journalLines;
}

/**
 * Creates a random journal entry
 */
function createRandomJournalEntry(
  company: Company,
  period: Period,
  users: User[],
  displayId: number,
): JournalEntry {
  // Filter users for this company
  const companyUsers = users.filter((user) => user.companyId === company.id);

  // Select random user as creator
  const createdBy = faker.helpers.arrayElement(companyUsers).id;

  // Transaction date must be within the period (inclusive)
  const minDate = DateTime.fromJSDate(period.startsOn);
  const maxDate = DateTime.fromJSDate(period.endsOn);

  // Make sure maxDate isn't after current time to avoid the faker.date.between error
  const now = DateTime.utc();

  const transactionDate = faker.date.between({
    from: minDate.toJSDate(),
    to: maxDate.toJSDate(),
  });

  // Created at can be any time as JEs can be added for the past or the future but we'll limit it
  // to be in the period we are working with
  const createdAt = faker.date.between({
    from: minDate.toJSDate(),
    to: maxDate.toJSDate(),
  });

  // Randomly decide if journal entry has been updated
  const isUpdated = faker.datatype.boolean({ probability: 0.3 });

  let updatedBy: string | null = null;
  let updatedAt = createdAt;

  if (isUpdated) {
    // Pick another random user as updater (could be same as creator)
    updatedBy = faker.helpers.arrayElement(companyUsers).id;

    // Updated at must be after or on created at, but not after current time
    updatedAt = faker.date.between({
      from: createdAt,
      to: maxDate.toJSDate(),
    });
  }

  // Randomly decide if journal entry is deleted
  const isDeleted = faker.datatype.boolean({ probability: 0.05 }); // 5% chance of being deleted

  // Determine status based on period dates
  let status: JournalEntryStatus;

  // If period is in the future, status must be Scheduled
  if (minDate > now) {
    status = JournalEntryStatus.Scheduled;
  } else {
    // If current date is within period or period is in the past, status can be any value
    status = randomEnum(JournalEntryStatus);
  }

  // Random entry type from EntryType
  const entryType = randomEnum(EntryType);

  // Create journal entry data
  const journalEntry: JournalEntry = {
    id: createId(),
    displayId,
    companyId: company.id,
    entryType,
    periodId: period.id,
    status,
    deleted: isDeleted,
    transactionDate,
    createdAt,
    createdBy,
    updatedAt,
    updatedBy,
    description: faker.lorem.sentence(),
  };

  logger.debug(
    `Generated journal entry: ID: ${journalEntry.id}, DisplayId: ${journalEntry.displayId}, Type: ${journalEntry.entryType}, Status: ${journalEntry.status}, Deleted: ${journalEntry.deleted}`,
  );

  return journalEntry;
}

/**
 * Creates journal line dimension associations
 */
function createJournalLineDimensions(
  journalLines: JournalLine[],
  dimensionValues: DimensionValue[],
): JournalLineDimension[] {
  // Group dimension values by company
  const dimensionValuesByCompany = _.groupBy(dimensionValues, "companyId");

  // Create journal line dimensions for approximately 30% of journal lines
  const journalLineDimensions: JournalLineDimension[] = [];

  for (const journalLine of journalLines) {
    // 30% chance to add dimension values to this line
    if (faker.datatype.boolean({ probability: 0.3 })) {
      // Get dimension values for this company
      const companyDimensionValues = dimensionValuesByCompany[journalLine.companyId] || [];

      if (companyDimensionValues.length === 0) {
        continue;
      }

      // Group dimension values by dimension to ensure we don't use multiple values from the same dimension
      const valuesByDimension = _.groupBy(companyDimensionValues, "dimensionId");
      const dimensionIds = Object.keys(valuesByDimension);

      if (dimensionIds.length === 0) {
        continue;
      }

      // Choose between 1 and 3 dimensions, or as many as are available
      const numDimensions = Math.min(faker.number.int({ min: 1, max: 3 }), dimensionIds.length);

      // Shuffle and pick random dimensions
      const shuffledDimensionIds = _.shuffle(dimensionIds).slice(0, numDimensions);

      // For each selected dimension, pick one of its values
      for (const dimensionId of shuffledDimensionIds) {
        const availableValues = valuesByDimension[dimensionId];
        const dimensionValue = faker.helpers.arrayElement(availableValues);

        const journalLineDimension: JournalLineDimension = {
          id: createId(),
          companyId: journalLine.companyId,
          journalLineId: journalLine.id,
          dimensionId: dimensionValue.dimensionId,
          dimensionValueId: dimensionValue.id,
          name: dimensionValue.dimensionName,
          value: dimensionValue.value,
        };

        journalLineDimensions.push(journalLineDimension);

        logger.debug(
          `Generated journal line dimension: ${journalLineDimension.name}=${journalLineDimension.value} ` +
            `for journal line ${journalLine.id}`,
        );
      }
    }
  }

  return journalLineDimensions;
}

/**
 * Creates journal entries for all periods of all companies
 */
async function createJournalEntries(
  companies: Company[],
  periods: Period[],
  users: User[],
  accounts: Account[],
  dimensionValues: DimensionValue[],
  minJournalEntriesPerPeriod: number,
  maxJournalEntriesPerPeriod: number,
  jsonMode: boolean = false,
): Promise<{
  journalEntries: JournalEntry[];
  journalLines: JournalLine[];
  journalLineDimensions: JournalLineDimension[];
}> {
  logger.info(`Creating journal entries for all periods...`);

  const allJournalEntries: JournalEntry[] = [];
  const allJournalLines: JournalLine[] = [];
  let globalDisplayId = 1; // Start with 1 for display IDs

  // Sort all periods by start date to ensure displayId increases with time
  const allPeriodsSorted = [...periods].sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime());

  // Go through all periods in chronological order
  for (const period of allPeriodsSorted) {
    const company = companies.find((c) => c.id === period.companyId)!;

    // Determine a random number of journal entries for this period
    const numEntries = faker.number.int({
      min: minJournalEntriesPerPeriod,
      max: maxJournalEntriesPerPeriod,
    });

    logger.info(
      `Creating ${numEntries} journal entries for period ${period.id} (${period.companyId})...`,
    );

    // Create journal entries for this period
    for (let i = 0; i < numEntries; i++) {
      const journalEntry = createRandomJournalEntry(company, period, users, globalDisplayId++);

      allJournalEntries.push(journalEntry);

      // Create journal lines for this entry
      const journalLines = createRandomJournalLines(journalEntry, accounts);
      allJournalLines.push(...journalLines);
    }
  }

  // Create journal line dimensions
  const allJournalLineDimensions = createJournalLineDimensions(allJournalLines, dimensionValues);

  // In JSON mode, just return the generated data
  if (jsonMode) {
    logger.info(
      `Generated data for ${allJournalEntries.length} journal entries with ${allJournalLines.length} journal lines ` +
        `and ${allJournalLineDimensions.length} journal line dimensions in total`,
    );
    return {
      journalEntries: allJournalEntries,
      journalLines: allJournalLines,
      journalLineDimensions: allJournalLineDimensions,
    };
  }

  // In DB mode, use createMany to insert all journal entries at once
  await prisma.journalEntry.createMany({
    data: allJournalEntries,
    skipDuplicates: true,
  });

  // Then create all journal lines
  if (allJournalLines.length > 0) {
    await prisma.journalLine.createMany({
      data: allJournalLines,
      skipDuplicates: true,
    });
  }

  // Then create all journal line dimensions
  if (allJournalLineDimensions.length > 0) {
    await prisma.journalLineDimension.createMany({
      data: allJournalLineDimensions,
      skipDuplicates: true,
    });
  }

  logger.info(
    `Created ${allJournalEntries.length} journal entries with ${allJournalLines.length} journal lines ` +
      `and ${allJournalLineDimensions.length} journal line dimensions in total`,
  );

  return {
    journalEntries: allJournalEntries,
    journalLines: allJournalLines,
    journalLineDimensions: allJournalLineDimensions,
  };
}

/**
 * Main function to execute data generation process
 */
async function main(args = process.argv.slice(2)) {
  // Get current year
  const currentYear = DateTime.utc().year;

  // Parse command line arguments
  const argv = yargs(args)
    .option("json", {
      type: "boolean",
      description: "Output data as JSON instead of writing to database",
      default: false,
    })
    .option("orgs", {
      type: "number",
      description: "Number of organizations to create",
      default: NUM_ORGANIZATIONS,
    })
    .option("companies", {
      type: "number",
      description: "Number of companies per organization to create",
      default: NUM_COMPANIES_PER_ORG,
    })
    .option("users", {
      type: "string",
      description: "Min and max users per company as 'min,max'",
      default: `${MIN_USERS_PER_COMPANY},${MAX_USERS_PER_COMPANY}`,
      coerce: (arg) => arg.split(",").map(Number),
    })
    .option("accounts", {
      type: "string",
      description: "Min and max accounts per company as 'min,max'",
      default: `${MIN_ACCOUNTS_PER_COMPANY},${MAX_ACCOUNTS_PER_COMPANY}`,
      coerce: (arg) => arg.split(",").map(Number),
    })
    .option("entries", {
      type: "string",
      description: "Min and max journal entries per period as 'min,max'",
      default: `${MIN_JOURNAL_ENTRIES_PER_PERIOD},${MAX_JOURNAL_ENTRIES_PER_PERIOD}`,
      coerce: (arg) => arg.split(",").map(Number),
    })
    .option("fiscalYears", {
      type: "string",
      description: "Start and end years for periods as 'startYear,endYear'",
      default: `${currentYear - 1},${currentYear + 1}`,
      coerce: (arg) => arg.split(",").map(Number),
    })
    .help()
    .parseSync(); // Use parseSync() instead of .argv to avoid Promise

  // Extract arguments
  const jsonMode = argv.json;
  const numOrgs = argv.orgs;
  const companiesPerOrg = argv.companies;
  const [minUsers, maxUsers] = argv.users;
  const [minAccounts, maxAccounts] = argv.accounts;
  const [minEntries, maxEntries] = argv.entries;
  const [startYear, endYear] = argv.fiscalYears;

  logger.info("Starting to generate fake data");

  try {
    // Generate organizations
    const organizations: Organization[] = await createOrganizations(numOrgs, jsonMode);

    // Generate companies for each organization
    const companies: Company[] = await createCompanies(organizations, companiesPerOrg, jsonMode);

    // Generate users for each company
    const users: User[] = await createUsers(companies, minUsers, maxUsers, jsonMode);

    // Generate accounts for each company
    const accounts: Account[] = await createAccounts(companies, minAccounts, maxAccounts, jsonMode);

    // Generate periods for each company
    const periods: Period[] = await createPeriods(companies, startYear, endYear, jsonMode);

    // Generate dimensions for each company
    const dimensions: Dimension[] = await createDimensions(companies, jsonMode);

    // Generate dimension values for each dimension
    const dimensionValues: DimensionValue[] = await createDimensionValues(dimensions, jsonMode);

    // Generate vendors from Vendor dimension values
    const vendors: Vendor[] = await createVendorsFromDimensions(dimensionValues, jsonMode);

    // Generate customers from Customer dimension values
    const customers: Customer[] = await createCustomersFromDimensions(dimensionValues, jsonMode);

    // Generate tasks for all companies
    const tasks: Task[] = await createTasks(companies, users, jsonMode);

    // Generate journal entries, journal lines, and journal line dimensions for each period
    const { journalEntries, journalLines, journalLineDimensions } = await createJournalEntries(
      companies,
      periods,
      users,
      accounts,
      dimensionValues,
      minEntries,
      maxEntries,
      jsonMode,
    );

    if (jsonMode) {
      // In JSON mode, output all data to stdout
      const jsonOutput = {
        organizations,
        companies,
        users,
        accounts,
        periods,
        dimensions,
        dimensionValues,
        vendors,
        customers,
        tasks,
        journalEntries,
        journalLines,
        journalLineDimensions,
      };

      // Pretty print JSON with 2-space indentation
      console.log(JSON.stringify(jsonOutput, null, 2));
    }

    logger.info("Finished generating fake data successfully");

    return {
      organizations,
      companies,
      users,
      accounts,
      periods,
      dimensions,
      dimensionValues,
      vendors,
      customers,
      tasks,
      journalEntries,
      journalLines,
      journalLineDimensions,
    };
  } catch (error) {
    logger.error("Error generating fake data:", error);

    // No need to disconnect - the prisma client is only initialized if needed

    process.exit(1);
  }
}

// Execute the script if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    logger.error("Unhandled error in script execution:", error);
    process.exit(1);
  });
}

// Named exports
export {
  createOrganizations,
  createCompanies,
  createUsers,
  createAccounts,
  createPeriods,
  createDimensions,
  createDimensionValues,
  createVendorsFromDimensions,
  createCustomersFromDimensions,
  createTasks,
  createJournalEntries,
  createJournalLineDimensions,
  randomEnum,
  main,
};

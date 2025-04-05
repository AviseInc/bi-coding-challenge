/**
 * Database Seeding Script for Business Intelligence Application
 * 
 * This script generates fake data for the application database, creating a structured dataset
 * that can be used for development and testing purposes. It populates the database with 
 * organizations, companies, users, accounts, and periods following proper business relationships and constraints.
 * 
 * Key features:
 * - Creates organizations with companies, ensuring proper relationships
 * - Generates users with appropriate permissions (admins, regular users)
 * - Creates accounts with proper GAAP accounting hierarchy (classifications, types, subtypes)
 * - Maintains parent-child relationships in account structure
 * - Creates periods (months) for each company for years 2024 and 2025 (with possibility of additional years)
 * - Properly sets period status as closed for past periods and open for current/future periods
 * - Can output data as JSON instead of writing to the database (--json flag)
 * - Uses batch operations for efficient database writes
 * 
 * Usage:
 *   pnpm exec ts-node scripts/makeFakeData.ts [options]
 * 
 * Options:
 *   --json      Output generated data as JSON instead of writing to the database
 *   --help      Show help information
 * 
 * @packageDocumentation
 */

import { faker } from '@faker-js/faker';
import { DateTime } from 'luxon';
import _ from 'lodash';
import { createId } from '@paralleldrive/cuid2';
import yargs from 'yargs';
import prisma from '../src/libraries/prisma';
import logger from '../src/libraries/logger';
import { Organization, Company, BasePeriod, Platform, CurrencyCode, User, UserStatus, AccountClassification, AccountType, AccountSubType, PeriodStatus } from '@prisma/client';

// Parse command line arguments
const argv = yargs(process.argv.slice(2))
  .option('json', {
    type: 'boolean',
    description: 'Output data as JSON instead of writing to database',
    default: false
  })
  .help()
  .parseSync(); // Use parseSync() instead of .argv to avoid Promise

/**
 * Script to generate fake data for the database
 * Run with: pnpm exec ts-node scripts/makeFakeData.ts
 */

// Configuration for the amount of fake data to generate
const NUM_ORGANIZATIONS = 3;
const NUM_COMPANIES_PER_ORG = 5;
const MIN_USERS_PER_COMPANY = 1;
const MAX_USERS_PER_COMPANY = 10;
const MIN_ACCOUNTS_PER_COMPANY = 6;  // At least 6 accounts per company
const MAX_ACCOUNTS_PER_COMPANY = 24; // Maximum 24 accounts per company

/**
 * Generate an ID from a name
 * Removes special characters, converts to snake case
 * Used for both organization and company IDs
 */
function generateIdFromName(name: string): string {
  // Trim whitespace, convert to lowercase
  const trimmed = _.trim(name).toLowerCase();
  
  // Remove special characters, keeping only alphanumeric and spaces
  const alphanumericOnly = trimmed.replace(/[^a-z0-9\s]/g, '');
  
  // Convert to snake case (replace spaces with underscores)
  return _.snakeCase(alphanumericOnly);
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
  
  logger.info(`Generated organization data: ${organization.fullName} (${organization.id})`);
  return organization;
}

/**
 * Creates multiple organizations
 */
async function createOrganizations(count: number = NUM_ORGANIZATIONS): Promise<Organization[]> {
  logger.info(`Creating ${count} organizations...`);
  
  const organizations: Organization[] = [];
  
  // Generate data for all organizations
  for (let i = 0; i < count; i++) {
    // Use the createRandomOrganization function to generate data
    const organization = createRandomOrganization();
    organizations.push(organization);
  }
  
  // In JSON mode, just return the generated data
  if (argv.json) {
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
function createRandomCompany(
  organization: Organization
): Company {
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
  
  logger.info(`Generated company data: ${company.name} (${company.id}) for organization: ${organization.fullName}`);
  return company;
}

/**
 * Creates multiple companies for an organization
 */
async function createCompaniesForOrganization(
  organization: Organization,
  count: number = NUM_COMPANIES_PER_ORG
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
async function createCompanies(organizations: Organization[]): Promise<Company[]> {
  logger.info(`Creating companies for ${organizations.length} organizations...`);
  
  const allCompanies: Company[] = [];
  
  for (const organization of organizations) {
    const companies = await createCompaniesForOrganization(organization);
    allCompanies.push(...companies);
  }
  
  // In JSON mode, just return the generated data
  if (argv.json) {
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
function createRandomUser(
  company: Company,
  isAdmin: boolean = false
): User {
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
  
  logger.info(`Generated user data: ${user.fullName} (${user.email}) for company: ${company.name} - Admin: ${user.isAdmin}, Status: ${user.status}`);
  return user;
}

/**
 * Creates multiple users for a company
 */
async function createUsersForCompany(company: Company): Promise<User[]> {
  // Determine a random number of users between min and max
  const numUsers = faker.number.int({ 
    min: MIN_USERS_PER_COMPANY, 
    max: MAX_USERS_PER_COMPANY 
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
async function createUsers(companies: Company[]): Promise<User[]> {
  logger.info(`Creating users for ${companies.length} companies...`);
  
  const allUsers: User[] = [];
  
  for (const company of companies) {
    const users = await createUsersForCompany(company);
    allUsers.push(...users);
  }
  
  // In JSON mode, just return the generated data
  if (argv.json) {
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
      return [
        AccountType.CurrentAsset,
        AccountType.FixedAsset,
        AccountType.LongTermAsset
      ];
    case AccountClassification.Liability:
      return [
        AccountType.CurrentLiability,
        AccountType.LongTermLiability,
        AccountType.ContingentLiability
      ];
    case AccountClassification.Equity:
      return [
        AccountType.Capital,
        AccountType.RetainedProfit,
        AccountType.Reserve
      ];
    case AccountClassification.Income:
      return [
        AccountType.OperatingRevenue,
        AccountType.NonOperatingRevenue,
        AccountType.GainOnSale
      ];
    case AccountClassification.Expense:
      return [
        AccountType.DirectExpense,
        AccountType.IndirectExpense,
        AccountType.OperatingExpense
      ];
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
        AccountSubType.MarketableSecurities
      ];
    case AccountType.FixedAsset:
      return [
        AccountSubType.Land,
        AccountSubType.Building,
        AccountSubType.Equipment,
        AccountSubType.Vehicles,
        AccountSubType.Furniture
      ];
    case AccountType.LongTermAsset:
      return [
        AccountSubType.Investments,
        AccountSubType.Goodwill,
        AccountSubType.IntangibleAssets,
        AccountSubType.LongTermDeposits,
        AccountSubType.DeferredTaxAsset
      ];
      
    // Liability Types
    case AccountType.CurrentLiability:
      return [
        AccountSubType.AccountsPayable,
        AccountSubType.ShortTermLoans,
        AccountSubType.AccruedLiabilities,
        AccountSubType.UnearnedRevenue,
        AccountSubType.CurrentPortionOfLTD
      ];
    case AccountType.LongTermLiability:
      return [
        AccountSubType.LongTermDebt,
        AccountSubType.Bonds,
        AccountSubType.Mortgages,
        AccountSubType.PensionLiability,
        AccountSubType.DeferredTaxLiability
      ];
    case AccountType.ContingentLiability:
      return [
        AccountSubType.LegalClaims,
        AccountSubType.ProductWarranties,
        AccountSubType.GuaranteeObligations,
        AccountSubType.EnvironmentalLiability
      ];
      
    // Equity Types
    case AccountType.Capital:
      return [
        AccountSubType.CommonStock,
        AccountSubType.PreferredStock,
        AccountSubType.AdditionalPaidInCapital,
        AccountSubType.OwnerInvestment,
        AccountSubType.PartnerCapital
      ];
    case AccountType.RetainedProfit:
      return [
        AccountSubType.RetainedEarnings,
        AccountSubType.AccumulatedProfits,
        AccountSubType.AccumulatedDeficit,
        AccountSubType.UndistributedProfit
      ];
    case AccountType.Reserve:
      return [
        AccountSubType.GeneralReserve,
        AccountSubType.CapitalReserve,
        AccountSubType.StatutoryReserve,
        AccountSubType.RevaluationReserve,
        AccountSubType.TreasuryStock
      ];
      
    // Income Types
    case AccountType.OperatingRevenue:
      return [
        AccountSubType.SalesRevenue,
        AccountSubType.ServiceRevenue,
        AccountSubType.CommissionRevenue,
        AccountSubType.FeeRevenue,
        AccountSubType.SubscriptionRevenue
      ];
    case AccountType.NonOperatingRevenue:
      return [
        AccountSubType.InterestIncome,
        AccountSubType.DividendIncome,
        AccountSubType.RentalIncome,
        AccountSubType.RoyaltyIncome,
        AccountSubType.LicensingRevenue
      ];
    case AccountType.GainOnSale:
      return [
        AccountSubType.GainOnSaleOfAssets,
        AccountSubType.GainOnInvestments,
        AccountSubType.GainOnDebtSettlement,
        AccountSubType.GainOnForeignExchange
      ];
      
    // Expense Types
    case AccountType.DirectExpense:
      return [
        AccountSubType.CostOfGoodsSold,
        AccountSubType.DirectLabor,
        AccountSubType.DirectMaterials,
        AccountSubType.ManufacturingOverhead,
        AccountSubType.PurchasesDiscounts
      ];
    case AccountType.IndirectExpense:
      return [
        AccountSubType.Salaries,
        AccountSubType.Rent,
        AccountSubType.Utilities,
        AccountSubType.OfficeSupplies,
        AccountSubType.Insurance
      ];
    case AccountType.OperatingExpense:
      return [
        AccountSubType.Marketing,
        AccountSubType.ResearchAndDevelopment,
        AccountSubType.Depreciation,
        AccountSubType.Amortization,
        AccountSubType.Interest
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
  parentAccount: { id: string, active: boolean, name: string, classification: AccountClassification, accountType: AccountType, accountSubType: AccountSubType } | null = null
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
  let fullyQualifiedName = '';
  
  if (parentAccount) {
    // For child accounts, use the first word from parent name 
    // then add a second random word, classification, type and subtype
    const parentFirstWord = parentAccount.name.split(' ')[0];
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
  const specialUseType = classification === AccountClassification.Expense && 
    faker.datatype.boolean({ probability: 0.2 }) ? 'AccruedExpense' as const : null;
  
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
    specialUseType: specialUseType
  };
  
  const parentInfo = parentAccount ? ` (child of ${parentAccount.id})` : '';
  logger.info(`Generated account data: ${account.name} (${account.id})${parentInfo} - Classification: ${account.classification}, Type: ${account.accountType}, SubType: ${account.accountSubType}, Active: ${account.active}`);
  
  return account;
}

/**
 * Creates accounts for a company, ensuring at least one account per classification
 */
async function createAccountsForCompany(company: Company) {
  // Determine number of accounts to create (between min and max)
  const numAccounts = faker.number.int({
    min: MIN_ACCOUNTS_PER_COMPANY,
    max: MAX_ACCOUNTS_PER_COMPANY
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
    const createChildAccount = parentAccounts.length > 0 && 
      faker.datatype.boolean({ probability: 0.3 });
    
    if (createChildAccount) {
      // Find a potential parent with the same classification
      const potentialParents = parentAccounts.filter(
        parent => parent.classification === classification
      );
      
      if (potentialParents.length > 0) {
        // Randomly select a parent
        const parentAccount = faker.helpers.arrayElement(potentialParents);
        
        // Create a child account with the same classification as the parent
        const childAccount = createRandomAccount(
          company,
          classification,
          parentAccount
        );
        
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
async function createAccounts(companies: Company[]) {
  logger.info(`Creating accounts for ${companies.length} companies...`);
  
  const allAccounts = [];
  
  for (const company of companies) {
    const accounts = await createAccountsForCompany(company);
    allAccounts.push(...accounts);
  }
  
  // In JSON mode, just return the generated data
  if (argv.json) {
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
 * Creates periods for a company
 * Generates periods for 2024 and 2025 (and optionally more years)
 * - Past periods are closed
 * - Current and future periods are open
 */
function createPeriodsForCompany(company: Company) {
  logger.info(`Creating periods for company ${company.name}...`);
  
  const periods = [];
  const now = DateTime.utc();
  const currentMonth = now.month;
  const currentYear = now.year;
  
  // Generate periods for 2024 and 2025, plus potentially some additional years
  const startYear = faker.datatype.boolean({ probability: 0.3 }) ? 2023 : 2024; // 30% chance to include 2023
  const endYear = faker.datatype.boolean({ probability: 0.2 }) ? 2026 : 2025;   // 20% chance to include 2026
  
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      // Create start and end dates for this period (month)
      const startDate = DateTime.utc(year, month, 1).startOf('month');
      const endDate = DateTime.utc(year, month, 1).endOf('month');
      // Target close is the end of the month
      const targetClose = endDate;
      
      // Determine if period should be closed or open (past periods are closed)
      let status: PeriodStatus;
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        status = PeriodStatus.closed;
      } else {
        status = PeriodStatus.open;
      }
      
      // Create three-letter month + year display name (e.g., "Jan 2024")
      const displayName = `${startDate.toFormat('MMM')} ${year}`;
      
      // Convert Luxon DateTime to JavaScript Date objects that Prisma can handle
      const period = {
        id: createId(), // Using cuid2 for ID
        companyId: company.id,
        displayName,
        // Use Luxon to create proper Date objects for Prisma
        startsOn: startDate.startOf('day').toJSDate(),
        endsOn: endDate.endOf('day').startOf('second').toJSDate(), // Remove milliseconds
        targetClose: targetClose.endOf('day').startOf('second').toJSDate(), // Remove milliseconds
        status,
        createdAt: now.toJSDate(),
        updatedAt: now.toJSDate()
      };
      
      periods.push(period);
      
      logger.info(`Generated period: ${period.displayName} (${period.id}) for company: ${company.name}, Status: ${period.status}`);
    }
  }
  
  return periods;
}

/**
 * Creates periods for all companies
 */
async function createPeriods(companies: Company[]) {
  logger.info(`Creating periods for ${companies.length} companies...`);
  
  const allPeriods = [];
  
  for (const company of companies) {
    const periods = createPeriodsForCompany(company);
    allPeriods.push(...periods);
  }
  
  // In JSON mode, just return the generated data
  if (argv.json) {
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

async function main() {
  logger.info('Starting to generate fake data');

  try {
    if (!argv.json) {
      // Only connect to the database if we're not in JSON mode
      await prisma.$connect();
      logger.info('Connected to database successfully');
    }
    
    // Generate organizations
    const organizations = await createOrganizations();
    
    // Generate companies for each organization
    const companies = await createCompanies(organizations);
    
    // Generate users for each company
    const users = await createUsers(companies);
    
    // Generate accounts for each company
    const accounts = await createAccounts(companies);
    
    // Generate periods for each company
    const periods = await createPeriods(companies);
    
    if (argv.json) {
      // In JSON mode, output all data to stdout
      const jsonOutput = {
        organizations,
        companies,
        users,
        accounts,
        periods
      };
      
      // Pretty print JSON with 2-space indentation
      console.log(JSON.stringify(jsonOutput, null, 2));
    }
    
    logger.info('Finished generating fake data successfully');
  } catch (error) {
    logger.error('Error generating fake data:', error);
    process.exit(1);
  } finally {
    if (!argv.json) {
      await prisma.$disconnect();
    }
  }
}

// Execute the script
main().catch((error) => {
  logger.error('Unhandled error in script execution:', error);
  process.exit(1);
});
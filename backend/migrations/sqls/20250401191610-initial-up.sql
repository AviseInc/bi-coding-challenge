-- Create Postgres enums first
CREATE TYPE base_period AS ENUM ('Month', 'Quarter');

CREATE TYPE platform AS ENUM ('QBO', 'Avise', 'CodatSandbox', 'Xero', 'OracleNetSuite');

CREATE TYPE currency_code AS ENUM (
    'AED', 'AFN', 'ALL', 'AMD', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM',
    'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BOV', 'BRL',
    'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHE', 'CHF', 'CHW',
    'CLF', 'CLP', 'CNY', 'COP', 'COU', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK',
    'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP',
    'GBP', 'GEL', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL',
    'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK', 'JMD',
    'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD',
    'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA',
    'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MXV',
    'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB',
    'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB',
    'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLL', 'SOS',
    'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND',
    'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'USN', 'UYI',
    'UYU', 'UYW', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XOF',
    'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL'
);

CREATE TYPE user_status AS ENUM ('Accepted', 'Pending', 'Disabled');

CREATE TYPE account_classification AS ENUM ('Asset', 'Equity', 'Expense', 'Liability', 'Income', 'Unknown');

CREATE TYPE account_special_use_type AS ENUM ('AccruedExpense');

CREATE TYPE period_status AS ENUM ('open', 'closed');

CREATE TYPE journal_entry_status AS ENUM ('Draft', 'Scheduled', 'Posted');

CREATE TYPE dimension_source AS ENUM ('QBO', 'Avise', 'AviseSystem', 'CodatSandbox', 'Xero', 'OracleNetSuite');

CREATE TYPE task_status AS ENUM ('planned', 'in_progress', 'completed', 'reviewed');

CREATE TYPE task_type AS ENUM ('account', 'reconciliation', 'category', 'flux');

CREATE TYPE frequency AS ENUM ('monthly', 'quarterly', 'yearly');

CREATE TABLE organizations (
                               id varchar PRIMARY KEY,
                               full_name varchar NOT NULL,
                               created_at timestamp with time zone NOT NULL,
                               updated_at timestamp with time zone NOT NULL
);

CREATE TABLE companies (
                           id varchar PRIMARY KEY,
                           name varchar NOT NULL,
                           timezone varchar NOT NULL,
                           platform platform NOT NULL,
                           created_at timestamp with time zone NOT NULL,
                           updated_at timestamp with time zone NOT NULL,
                           base_period base_period NOT NULL,
                           fiscal_year_start_month integer NOT NULL,
                           fiscal_year_start_day integer NOT NULL,
                           multi_currency_enabled boolean NOT NULL,
                           home_currency currency_code NOT NULL,
                           organization_id varchar NOT NULL REFERENCES organizations (id) ON DELETE CASCADE
);

CREATE TABLE users (
                       id varchar PRIMARY KEY,
                       company_id varchar NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
                       email varchar NOT NULL,
                       full_name varchar NOT NULL,
                       is_admin boolean NOT NULL DEFAULT FALSE,
                       status user_status NOT NULL,
                       created_at timestamp with time zone NOT NULL,
                       updated_at timestamp with time zone NOT NULL,
                       UNIQUE (company_id, email)
);

CREATE TABLE accounts (
                          id varchar PRIMARY KEY,
                          company_id varchar REFERENCES companies (id) ON DELETE CASCADE,
                          created_at timestamp with time zone NOT NULL,
                          parent_account_id varchar REFERENCES accounts (id) ON DELETE CASCADE,
                          currency currency_code NOT NULL,
                          fully_qualified_name varchar NOT NULL,
                          name varchar NOT NULL,
                          active boolean NOT NULL DEFAULT TRUE,
                          classification account_classification NOT NULL,
                          account_type varchar NOT NULL,
                          account_sub_type varchar NOT NULL,
                          special_use_type account_special_use_type,
                          UNIQUE (company_id, fully_qualified_name, active)
);

CREATE TABLE periods (
                         id varchar PRIMARY KEY,
                         company_id varchar NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
                         display_name varchar NOT NULL,
                         starts_on date NOT NULL,
                         ends_on date NOT NULL,
                         target_close date NOT NULL,
                         created_at timestamp with time zone NOT NULL,
                         updated_at timestamp with time zone NOT NULL,
                         status period_status NOT NULL DEFAULT 'open',
                         UNIQUE(company_id, display_name),
                         UNIQUE(company_id, starts_on, ends_on)
);

CREATE TABLE journal_entries (
                                 id varchar PRIMARY KEY,
                                 display_id integer NOT NULL,
                                 company_id varchar REFERENCES companies (id) ON DELETE CASCADE,
                                 entry_type varchar NOT NULL,
                                 period_id varchar REFERENCES periods (id) ON DELETE CASCADE,
                                 status journal_entry_status NOT NULL DEFAULT 'Posted',
                                 deleted boolean NOT NULL DEFAULT FALSE,
                                 transaction_date date NOT NULL,
                                 created_at timestamp with time zone NOT NULL,
                                 created_by varchar NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                                 updated_at timestamp with time zone NOT NULL,
                                 updated_by varchar REFERENCES users (id),
                                 description varchar NOT NULL DEFAULT '',
                                 UNIQUE(company_id, display_id)
);

CREATE TABLE journal_lines (
                               id varchar PRIMARY KEY,
                               company_id varchar NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
                               account_id varchar REFERENCES accounts (id) ON DELETE CASCADE,
                               journal_entry_id varchar NOT NULL REFERENCES journal_entries (id) ON DELETE CASCADE,
                               description varchar NOT NULL DEFAULT '',
                               amount integer
);

CREATE TABLE dimensions (
                            id varchar PRIMARY KEY,
                            company_id varchar NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
                            name varchar(36) NOT NULL,
                            active boolean NOT NULL DEFAULT TRUE,
                            source dimension_source NOT NULL DEFAULT 'Avise',
                            UNIQUE (company_id, name, active, source)
);

CREATE TABLE dimension_values (
                                  id varchar PRIMARY KEY,
                                  company_id varchar NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
                                  dimension_id varchar NOT NULL REFERENCES dimensions (id) ON DELETE CASCADE,
                                  dimension_name varchar NOT NULL,
                                  value varchar NOT NULL,
                                  description varchar,
                                  active boolean NOT NULL DEFAULT TRUE
);

CREATE TABLE journal_line_dimensions (
                                        id varchar PRIMARY KEY,
                                        company_id varchar NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
                                        journal_line_id varchar NOT NULL REFERENCES journal_lines (id) ON DELETE CASCADE,
                                        dimension_id varchar NOT NULL REFERENCES dimensions (id) ON DELETE CASCADE,
                                        dimension_value_id varchar NOT NULL REFERENCES dimension_values (id) ON DELETE CASCADE,
                                        name varchar NOT NULL,
                                        value varchar NOT NULL
);

CREATE TABLE tasks (
                       id varchar PRIMARY KEY,
                       company_id varchar NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
                       title varchar NOT NULL,
                       description text NOT NULL,
                       created_at timestamp with time zone NOT NULL,
                       updated_at timestamp with time zone NOT NULL,
                       created_by varchar REFERENCES users (id) ON DELETE CASCADE,
                       due_date date NOT NULL,
                       frequency frequency,
                       status task_status NOT NULL DEFAULT 'planned',
                       resolution text,
                       assigned_to varchar REFERENCES users (id) ON DELETE CASCADE,
                       reviewer varchar REFERENCES users (id) ON DELETE CASCADE,
                       category varchar,
                       completed_on timestamp with time zone,
                       task_type task_type NOT NULL
);

CREATE TABLE vendors (
                         id varchar PRIMARY KEY,
                         company_id varchar REFERENCES companies (id) ON DELETE CASCADE,
                         active boolean NOT NULL,
                         display_name varchar NOT NULL,
                         created_at timestamp with time zone NOT NULL,
                         updated_at timestamp with time zone NOT NULL,
                         UNIQUE (company_id, display_name, active)
);

CREATE TABLE customers (
                           id varchar PRIMARY KEY,
                           company_id varchar REFERENCES companies (id) ON DELETE CASCADE,
                           active boolean NOT NULL,
                           display_name varchar NOT NULL,
                           created_at timestamp with time zone NOT NULL,
                           updated_at timestamp with time zone NOT NULL,
                           UNIQUE (company_id, display_name, active)
);

CREATE INDEX accounts_company_id ON accounts (company_id);

CREATE INDEX journal_entries_company_id_transaction_date ON journal_entries (company_id, transaction_date);

CREATE INDEX journal_entries_company_id ON journal_entries (company_id);

CREATE INDEX journal_lines_journal_entry_id ON journal_lines (journal_entry_id);

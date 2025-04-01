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
                           platform varchar NOT NULL,
                           created_at timestamp with time zone NOT NULL,
                           updated_at timestamp with time zone NOT NULL,
                           base_period varchar NOT NULL CHECK (base_period in ('Month', 'Quarter')),
                           fiscal_year_start_month integer NOT NULL,
                           fiscal_year_start_day integer NOT NULL,
                           multi_currency_enabled boolean NOT NULL,
                           home_currency varchar NOT NULL CHECK (multiCurrencyEnabled in ())
                           organization_id varchar NOT NULL REFERENCES organizations (id) ON DELETE CASCADE
);

CREATE TABLE users (
                       id varchar PRIMARY KEY,
                       company_id varchar NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
                       email varchar NOT NULL,
                       full_name varchar NOT NULL,
                       is_admin boolean NOT NULL DEFAULT FALSE,
                       status varchar NOT NULL CHECK (status in ('Accepted', 'Pending', 'Disabled')),
                       created_at timestamp with time zone NOT NULL,
                       updated_at timestamp with time zone NOT NULL,
                       UNIQUE (company_id, email)
);

CREATE TABLE accounts (
                          id varchar PRIMARY KEY,
                          company_id varchar REFERENCES companies (id) ON DELETE CASCADE,
                          created_at timestamp with time zone NOT NULL,
                          parent_account_id varchar REFERENCES accounts (id) ON DELETE CASCADE,
                          currency varchar NOT NULL,
                          fully_qualified_name varchar NOT NULL,
                          name varchar NOT NULL,
                          active boolean NOT NULL DEFAULT TRUE,
                          classification varchar NOT NULL CHECK (
                              classification in (
                                                 'Asset',
                                                 'Equity',
                                                 'Expense',
                                                 'Income',
                                                 'Liability'
                                  )
                              ),
                          account_type varchar NOT NULL,
                          account_sub_type varchar NOT NULL,
                          special_use_type varchar,
                          UNIQUE (company_id, fully_qualified_name, active)
);

CREATE TABLE journal_entries (
                                 id varchar PRIMARY KEY,
                                 display_id integer NOT NULL,
                                 company_id varchar REFERENCES companies (id) ON DELETE CASCADE,
                                 entry_type varchar NOT NULL,
                                 period_id varchar REFERENCES periods ON DELETE CASCADE,
                                 status varchar NOT NULL DEFAULT ('Posted') CHECK (status IN ('Scheduled', 'Draft', 'Posted')),
                                 deleted boolean NOT NULL DEFAULT TRUE,
                                 transaction_date timestamp with time zone NOT NULL,
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
                               amount double precision NOT NULL
);

CREATE TABLE periods (
                         id varchar PRIMARY KEY,
                         company_id varchar NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
                         display_name varchar NOT NULL,
                         starts_on timestamp with time zone NOT NULL,
                         ends_on timestamp with time zone NOT NULL,
                         target_close timestamp with time zone NOT NULL,
                         created_at timestamp with time zone NOT NULL,
                         updated_at timestamp with time zone NOT NULL,
                         status varchar NOT NULL DEFAULT 'open' CHECK (
                             status in ('open', 'closed')
                             ),
                         UNIQUE(company_id, display_name),
                         UNIQUE(company_id, starts_on, ends_on)
);

CREATE TABLE dimensions (
                            id varchar PRIMARY KEY,
                            company_id varchar NOT NULL REFERENCES companies ON DELETE CASCADE,
                            name varchar(36) NOT NULL,
                            active boolean NOT NULL DEFAULT TRUE,
                            source varchar NOT NULL DEFAULT 'Avise' CHECK (source in ('QBO', 'OracleNetsuite', 'Avise', 'AviseSystem')),
                            UNIQUE (company_id, name, active, source)
);

CREATE TABLE dimension_values (
                                  id varchar PRIMARY KEY,
                                  company_id varchar NOT NULL REFERENCES companies ON DELETE CASCADE,
                                  dimension_name varchar NOT NULL,
                                  value varchar NOT NULL,
                                  description varchar,
                                  active boolean NOT NULL DEFAULT TRUE,
                                  FOREIGN KEY (id) REFERENCES dimensions (id) ON UPDATE CASCADE
);

CREATE TABLE tasks (
                       id varchar PRIMARY KEY,
                       company_id varchar NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
                       title varchar NOT NULL,
                       description text NOT NULL,
                       created_at timestamp with time zone NOT NULL,
                       updated_at timestamp with time zone NOT NULL,
                       created_by varchar REFERENCES users (id) ON DELETE CASCADE,
                       due_date timestamp with time zone NOT NULL,
                       frequency varchar,
                       status varchar NOT NULL DEFAULT 'planned' CHECK (
                           status in (
                                      'planned',
                                      'in_progress',
                                      'completed',
                                      'reviewed'
                               )
                           ),
                       resolution text,
                       assigned_to varchar REFERENCES users (id) ON DELETE CASCADE,
                       reviewer_to varchar REFERENCES users (id) ON DELETE CASCADE,
                       category varchar,
                       completed_on timestamp with time zone,
                       task_type varchar NOT NULL CHECK (
                           task_type in ('account', 'reconciliation', 'flux', 'category')
                           )
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

CREATE INDEX jounral_lines_journal_entry_id ON journal_lines (journal_entry_id);

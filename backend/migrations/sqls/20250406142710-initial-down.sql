DROP INDEX accounts_company_id;

DROP INDEX journal_entries_company_id_transaction_date;

DROP INDEX journal_entries_company_id;

DROP INDEX journal_lines_journal_entry_id;

DROP TABLE customers;

DROP TABLE vendors;

DROP TABLE tasks;

DROP TABLE journal_line_dimensions;

DROP TABLE dimension_values;

DROP TABLE dimensions;

DROP TABLE periods;

DROP TABLE journal_lines;

DROP TABLE journal_entries;

DROP TABLE accounts;

DROP TABLE users;

DROP TABLE companies;

DROP TABLE organizations;

-- Drop enum types after tables that reference them
DROP TYPE frequency;
DROP TYPE task_type;
DROP TYPE task_status;
DROP TYPE dimension_source;
DROP TYPE journal_entry_status;
DROP TYPE period_status;
DROP TYPE entry_type;
DROP TYPE account_special_use_type;
DROP TYPE account_sub_type;
DROP TYPE account_type;
DROP TYPE account_classification;
DROP TYPE user_status;
DROP TYPE currency_code;
DROP TYPE platform;
DROP TYPE base_period;

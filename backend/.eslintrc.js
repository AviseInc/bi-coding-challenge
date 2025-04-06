module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "n", "functional", "import", "unicorn"],
  parserOptions: {
    ecmaVersion: 2020,
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json", "./tests/tsconfig.json", "./tests/smoke/tsconfig.json"],
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
  ],
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts"],
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  rules: {
    // Extra configuration for recommended rules
    // Disable the ESLint base version and configure the special Typescript version
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-inferrable-types": [
      "warn",
      {
        ignoreParameters: true,
        ignoreProperties: true,
      },
    ],
    "@typescript-eslint/no-misused-promises": [
      "warn",
      {
        checksVoidReturn: false,
      },
    ],
    "@typescript-eslint/restrict-template-expressions": [
      "warn",
      {
        allowNullish: true,
        allowBoolean: true,
      },
    ],
    "@typescript-eslint/no-use-before-define": [
      "warn",
      { functions: false, enums: false, classes: true, variables: true },
    ],

    // Disabling recommended rules
    "no-case-declarations": "off",
    "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-confusing-non-null-assertion": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/unbound-method": "off",

    // Extra rules
    eqeqeq: ["warn"],
    "no-param-reassign": ["warn"],
    "@typescript-eslint/no-base-to-string": ["warn"],
    "@typescript-eslint/no-extraneous-class": ["warn"],
    "@typescript-eslint/switch-exhaustiveness-check": ["warn"],
    "@typescript-eslint/prefer-optional-chain": ["warn"],
    "@typescript-eslint/return-await": ["warn", "in-try-catch"],
    "@typescript-eslint/no-throw-literal": ["warn"],
    "@typescript-eslint/no-shadow": ["warn"],
    "@typescript-eslint/no-unnecessary-type-assertion": ["warn"],
    "no-console": ["warn"],

    // Load all environment variables in the env validator and then through the config/module.
    "n/no-process-env": ["warn"],

    // Prefer Promise-based APIs over warn-first callback APIs
    "n/prefer-promises/dns": ["warn"],
    "n/prefer-promises/fs": ["warn"],

    // Use central Joi with good configuration and extensions
    "@typescript-eslint/no-restricted-imports": [
      "warn",
      {
        name: "joi",
        message: "Please only import Joi as the default export from src/Joi.ts",
        allowTypeImports: true,
      },
      {
        name: ".prisma/client",
        message: "Please use @prisma/client instead.",
      },
    ],

    "@typescript-eslint/no-require-imports": ["warn"],
    "@typescript-eslint/no-redundant-type-constituents": 0,
    "@typescript-eslint/no-unsafe-enum-comparison": 0,

    "import/no-restricted-paths": [
      "warn",
      {
        zones: [
          {
            target: "./src/data",
            from: "./src/services",
          },
        ],
      },
    ],

    "no-duplicate-imports": ["warn"],
    "unicorn/filename-case": [
      "warn",
      {
        case: "camelCase",
      },
    ],

    // See https://eslint.org/docs/latest/extend/selectors for more information on selectors
    "no-restricted-syntax": [
      "error",
      /**
       * DO NOT USE PRISMA.RAW!
       *
       * You will have to use the Prisma.sql`` tag to get the correct types that are safe from SQL injection.
       * Prisma can't handle templates within postgres string literals, so you will also have to use
       * trial and error to get the strings to escape properly see this link for Prisma's documentation.
       * https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#considerations
       *
       * Logging will not help you that much either. There is a helper command to convert a prisma log
       * statement to a runnable postgres query. (pnpm run convert-logged-db-query)
       * It, however, does not work super well with nested strings or postgres string literals. (just like Prisma.sql)
       * It will help in getting a running query to paste into your favorite SQL editor with as few edits as possible.
       * mostly around escaping the strings.
       *
       * Neither Prisma nor Postgres log the _actual_ query that is run. They both log the query with
       * the string literals replaced with $1, $2, etc. The actual values logged by Prisma are not always
       * the same values that Postgres would log. This does not mean that the Prisma log is wrong, but
       * is very confusing.
       *
       * See `balanceSheetReportV2.ts` and `preparedScheduleReportData.ts` in the data layer
       * for example on how to do some complex Prisma.sql.
       *
       */
      {
        selector: "MemberExpression[object.name='Prisma'][property.name='raw']",
        message: "Do not use Prisma.raw. It is vulnerable to SQL injection.",
      },
      {
        selector: "NewExpression[callee.type='Identifier'][callee.name='Date']",
        message: "Do not use new Date(...). Use the functions provided in src/util/dateUtil.ts",
      },
    ],
  },
  overrides: [
    {
      files: ["tests/**/*"],
      rules: {
        // since we have strictNullChecks: false in the test's tsconfig we need to turn
        // off the strictNullChecks rule only for the test files
        "@typescript-eslint/no-unnecessary-type-assertion": "off",
        // since we have noImplicitReturns: false in the test's tsconfig we need to turn
        // off the no unsafe return rule only for the test files
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-unsafe-call": "off",
      },
    },
  ],
  env: {
    node: true,
    es6: true,
  },
};

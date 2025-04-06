import "dotenv/config";
import yargs from "yargs";
import prisma from "../../src/libraries/prisma";
import { ClackWrapper } from "./clackWrapper";

async function checkForReadyAndStart(clackWrapper: ClackWrapper, introMessage: string) {
  clackWrapper.introMessage(introMessage);

  const usrReady = await clackWrapper.confirm({
    message: "Are you ready to begin?",
  });

  if (!usrReady) {
    clackWrapper.exit("That's okay! Come back when you're ready!");
  }
}

async function handleDockerPull(clackWrapper: ClackWrapper, attempt: number = 0): Promise<void> {
  if (attempt >= 3) {
    clackWrapper.exit("Unable to pull docker", new Error("Error while trying to pull docker!"));
  }

  try {
    await clackWrapper.doAsyncSpinner({
      startMessage: "Pulling docker",
      endMessage: "Successfully pulled docker",
      errorMessage: "Unable to pull docker",
      command: "docker compose pull",
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("i/o timeout")) {
      return handleDockerPull(clackWrapper, attempt + 1);
    }
  }
}

async function handleDockerSetup(clackWrapper: ClackWrapper) {
  await clackWrapper.doAsyncSpinner({
    startMessage: "Stopping docker containers",
    endMessage: "Successfully stopped docker containers",
    errorMessage: "Unable to stop docker containers",
    command: "docker compose down",
  });

  await handleDockerPull(clackWrapper);

  await clackWrapper.doAsyncSpinner({
    startMessage: "Starting docker containers",
    endMessage: "Successfully started docker containers",
    errorMessage: "Unable to start docker containers",
    command: "docker compose up -d",
  });

  // wait for docker to actually be up
  await clackWrapper.waitForDockerContainerToBeRunning("backend-postgres-1");
}

/**
 * The FIRST TIME we run the api locally, we have to do some additional stuff
 */
async function handleFirstTimeDockerSetup(clackWrapper: ClackWrapper) {
  await clackWrapper.doAsyncSpinner({
    startMessage: "Stopping docker containers and removing volumes",
    endMessage: "Successfully stopped docker containers and removed volumes",
    errorMessage: "Unable to stop docker containers and remove volumes",
    command: "docker compose down -v",
  });

  await handleDockerPull(clackWrapper);

  await clackWrapper.doAsyncSpinner({
    startMessage: "Starting postgres service",
    endMessage: "Successfully started postgres service",
    errorMessage: "Unable to start postgres service",
    command: "docker compose up -d postgres",
  });

  // wait for postgres to actually be up
  await clackWrapper.waitForDockerContainerToBeRunning("backend-postgres-1", true);

  await clackWrapper.doAsyncSpinner({
    startMessage: "Restarting docker containers",
    endMessage: "Successfully restarted docker containers",
    errorMessage: "Unable to restart docker containers",
    command: "docker compose down && docker compose up -d",
  });
}

async function handleDbSanityCheck(clackWrapper: ClackWrapper) {
  const org = await prisma.organization.findFirst();
  const user = await prisma.user.findFirst();

  if (org || user) {
    clackWrapper.exit("Database already has records, stopping further execution!");
  }
}

async function handleDbMigrations(clackWrapper: ClackWrapper) {
  await clackWrapper.doAsyncSpinner({
    startMessage: "Migrating local Postgres",
    endMessage: "Successfully migrated local Postgres",
    errorMessage: "Unable to migrate local Postgres",
    command: "pnpm run migrate-local",
  });
}

async function handlePnpmInstall(clackWrapper: ClackWrapper, frozenLockfile: boolean = false) {
  if (frozenLockfile) {
    try {
      await clackWrapper.doAsyncSpinner({
        command: "pnpm install --frozen-lockfile",
        startMessage: `Installing pnpm packages via pnpm install --frozen-lockfile`,
        endMessage: `Successfully installed pnpm packages via pnpm install --frozen-lockfile`,
        errorMessage: `Unable to install pnpm packages via pnpm install --frozen-lockfile`,
        exitOnFail: false,
      });

      return;
    } catch (e) {
      clackWrapper.noteMessage("Unable to install via frozen lockfile, trying without...");
    }
  }

  await clackWrapper.doAsyncSpinner({
    command: "pnpm install",
    startMessage: `Installing pnpm packages.`,
    endMessage: `Successfully installed pnpm packages.`,
    errorMessage: `Unable to install pnpm packages.`,
  });
}

async function handleGenerateData(clackWrapper: ClackWrapper) {
  await clackWrapper.doAsyncSpinner({
    startMessage: "Generating fake data",
    endMessage: "Successfully generated fake data",
    errorMessage: "Unable to generate fake data",
    command: "pnpm run generate-data",
  });
}

async function generateFakeData(clackWrapper: ClackWrapper) {
  await handleDbSanityCheck(clackWrapper);
  await handleGenerateData(clackWrapper);
}

async function setupApiFromScratch(clackWrapper: ClackWrapper) {
  await handlePnpmInstall(clackWrapper, true);
  await handleFirstTimeDockerSetup(clackWrapper);
  await handleDbMigrations(clackWrapper);
  await handleDbSanityCheck(clackWrapper);
}

async function doInitialSetup(clackWrapper: ClackWrapper) {
  await checkForReadyAndStart(
    clackWrapper,
    "This script will help in setting up your local API for the first time. Please stay around as various parts will require user input and/or confirmation.",
  );

  let usrReady = await clackWrapper.confirm({
    message: "I solemnly swear that docker is installed and running.",
  });

  if (!usrReady) {
    clackWrapper.exit("Check readme section 2.1 for a link to install docker if needed!");
  }

  await setupApiFromScratch(clackWrapper);

  clackWrapper.exit("\u{1f389} Great success, have a wonderful day!");
}

async function doHelpMe(clackWrapper: ClackWrapper) {
  await checkForReadyAndStart(
    clackWrapper,
    "This script will help in getting your local API back into a usable state. Please stay around as various parts will require user input and/or confirmation.",
  );

  await handlePnpmInstall(clackWrapper, true);
  await handleDockerSetup(clackWrapper);
  await handleDbMigrations(clackWrapper);

  clackWrapper.exit("\u{1F528} Attempted repair successfully. Good luck out there!");
}

async function doCompleteRefresh(clackWrapper: ClackWrapper) {
  await checkForReadyAndStart(
    clackWrapper,
    "This script will help in completely refreshing your local API. Please stay around as various parts will require user input and/or confirmation.",
  );

  let usrReady = await clackWrapper.confirm({
    message:
      "I understand that all local data will be DELETED and will be UNRECOVERABLE and want to proceed.",
  });

  if (!usrReady) {
    clackWrapper.exit("Exiting without modifying data.");
  }

  usrReady = await clackWrapper.confirm({
    message:
      "I doubly confirm that I understand that all local data will be DELETED and will be UNRECOVERABLE and still want to proceed.",
  });

  if (!usrReady) {
    clackWrapper.exit("Exiting without modifying data.");
  }

  await setupApiFromScratch(clackWrapper);

  clackWrapper.exit("\u{1f389} Great success, enjoy the fresh start!");
}

async function doGenerateData(clackWrapper: ClackWrapper) {
  await checkForReadyAndStart(
    clackWrapper,
    "This script will generate fake data in your database. Please stay around as various parts will require user input and/or confirmation.",
  );

  let dbEmpty = await clackWrapper.confirm({
    message: "Is the database empty.",
  });

  if (!dbEmpty) {
    clackWrapper.exit("Exiting without modifying data.");
  }

  await generateFakeData(clackWrapper);

  clackWrapper.exit("\u{1f389} Great success, enjoy the new data!");
}

async function main() {
  const args = yargs(process.argv)
    .option("initialSetup", {
      boolean: true,
    })
    .option("helpMe", {
      boolean: true,
    })
    .option("completeRefresh", {
      boolean: true,
    })
    .option("generateData", {
      boolean: true,
    })
    .parseSync();

  const { initialSetup, helpMe, completeRefresh, generateData } = args;

  const numberOfOptions =
    Number(initialSetup || 0) +
    Number(helpMe || 0) +
    Number(completeRefresh || 0) +
    Number(generateData || 0);

  if (numberOfOptions > 1) {
    throw new Error("Please choose only one option!");
  }

  const clackWrapper = new ClackWrapper();

  await clackWrapper.init();

  if (initialSetup) {
    return doInitialSetup(clackWrapper);
  }

  if (helpMe) {
    return doHelpMe(clackWrapper);
  }

  if (completeRefresh) {
    return doCompleteRefresh(clackWrapper);
  }

  if (generateData) {
    return doGenerateData(clackWrapper);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));

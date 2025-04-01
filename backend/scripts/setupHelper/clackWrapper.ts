import type {
  ConfirmOptions,
  SelectOptions,
  TextOptions,
  confirm,
  select,
  text,
  intro,
  isCancel,
  note,
  outro,
  spinner,
  //@ts-expect-error
} from "@clack/prompts";
import { exec, spawn } from "node:child_process";

// this interface wasn't exported so had to copy/paste it here
type Primitive = Readonly<string | boolean | number>;
type Option<Value> = Value extends Primitive
  ? {
      value: Value;
      label?: string;
      hint?: string;
    }
  : {
      value: Value;
      label: string;
      hint?: string;
    };

interface DoAsyncSpinnerParams {
  startMessage: string;
  endMessage: string;
  errorMessage: string;
  command: string;
  type?: "exec" | "spawn";
  exitOnFail?: boolean;
}

export class ClackWrapper {
  private _confirm: typeof confirm | undefined;
  private select: typeof select | undefined;
  private _text: typeof text | undefined;
  private _intro: typeof intro | undefined;
  private isCancel: typeof isCancel | undefined;
  private _note: typeof note | undefined;
  private outro: typeof outro | undefined;
  private spinner: ReturnType<typeof spinner> | undefined;

  public async init() {
    const p = await import("@clack/prompts");

    this._confirm = p.confirm;
    this.select = p.select;
    this._text = p.text;
    this._intro = p.intro;
    this.isCancel = p.isCancel;
    this._note = p.note;
    this.outro = p.outro;
    this.spinner = p.spinner();
  }

  public async confirm(params: ConfirmOptions): Promise<boolean> {
    const r = await this._confirm!(params);

    if (this.isCancel!(r)) {
      this.exit("Alright, well good luck out there!");
    }

    return Boolean(r);
  }

  public async text(params: TextOptions): Promise<string> {
    const r = await this._text!(params);

    if (this.isCancel!(r)) {
      this.exit("Alright, well good luck out there!");
    }

    return String(r);
  }

  public async selectAnswer<Options extends Option<Value>[], Value>(
    params: SelectOptions<Options, Value>,
  ): Promise<string> {
    const r = await this.select!(params);

    if (this.isCancel!(r)) {
      this.exit("Alright, well good luck out there!");
    }

    return String(r);
  }

  public noteMessage(message: string) {
    this._note!(message);
  }

  public introMessage(message: string) {
    this._intro!(message);
  }

  public outroMessage(message: string) {
    this.outro!(message);
  }

  public async doAsyncSpinner({
    startMessage,
    endMessage,
    errorMessage,
    command,
    type = "exec",
    exitOnFail = true,
  }: DoAsyncSpinnerParams) {
    try {
      this.spinner!.start(startMessage);
      type === "exec" ? await this.promisifyExec(command) : await this.promisifySpawn(command);
      this.spinner!.stop(
        endMessage.endsWith(".") || endMessage.endsWith("!") ? endMessage : endMessage + ".",
      );
    } catch (err) {
      if (exitOnFail) this.exit(errorMessage, err);
      else throw err;
    }
  }

  public async promisifyExec(input: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(
        input,
        {
          shell: "zsh",
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
          }
          resolve(stdout ? stdout : stderr);
        },
      );
    });
  }

  // needed for docker login for aws-elevation code to show
  public async promisifySpawn(input: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (input.includes("pnpm")) {
        reject("Just give the name of the script to run without `pnpm run`.");
      }

      const childProcess = spawn("pnpm", ["run", input]);

      let stdout = "";
      let stderr = "";

      // this is needed for the aws-elevation code to show
      // it seems it is printed to stderr??? but checking
      // both for safety
      childProcess.stdout.on("data", (data) => {
        stdout += data.toString();
        if (data.toString().includes("?user_code")) {
          const code = data.toString().split("?user_code=")?.[1].split("\n")?.[0] ?? "Unknown Code";
          this.noteMessage(`Confirm this code in AWS popup window: ${code}`);
        }
      });

      childProcess.stderr.on("data", (data) => {
        stderr += data.toString();
        if (data.toString().includes("?user_code")) {
          const code = data.toString().split("?user_code=")?.[1].split("\n")?.[0] ?? "Unknown Code";
          this.noteMessage(`Confirm this code in AWS popup window: ${code}`);
        }
      });

      childProcess.on("error", (err) => {
        reject(err);
      });

      childProcess.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject({ code, stdout, stderr });
        }
      });
    });
  }

  public exit(exitMessage: string, err?: Error) {
    if (err) {
      console.error(err);
    }

    this.outroMessage(exitMessage);
    process.exit(err ? 1 : 0);
  }

  public async waitForDockerContainerToBeRunning(
    containerName: string,
    checkForHealthy: boolean = false,
  ) {
    this.spinner!.start(`Waiting for ${containerName} container to be running.`);

    let containerRunning = false;
    const timeout = setTimeout(
      () =>
        this.exit(
          `The ${containerName} container wasn't responsive in time!`,
          new Error(`The ${containerName} container wasn't responsive in time!`),
        ),
      30_000, // 30 seconds
    );

    try {
      while (!containerRunning) {
        await new Promise((resolve) => setTimeout(resolve, 250));

        const resp = await this.promisifyExec(`docker container inspect ${containerName}`);
        const asJson = JSON.parse(resp);

        // docker magic
        containerRunning = asJson[0].State.Running && !asJson[0].State.Restarting;

        if (checkForHealthy) {
          containerRunning = containerRunning && asJson[0].State.Health.Status === "healthy";
        }
      }
    } catch (err) {
      this.exit(
        `The ${containerName} container doesn't exist!`,
        new Error(`The ${containerName} container doesn't exist!`),
      );
    }
    clearTimeout(timeout);
    this.spinner!.stop(`The ${containerName} container is running.`);
  }

  public async ensureSpiceDbDatabaseExistsInPostgres(): Promise<void> {
    this.spinner!.start("Checking for the existence of spicedb");

    const resp = await this.promisifyExec(
      "docker exec avise-api-postgres-1 psql -U postgres -c \"SELECT 1 FROM pg_database where datname = 'spicedb'\"",
    );

    if (resp.includes("(0 rows)")) {
      this.spinner!.stop("spicedb doesn't exist! Creating...");
      await this.doAsyncSpinner({
        startMessage: "Creating spicedb database",
        endMessage: "Successfully created spicedb database",
        errorMessage: "Unable to create spicedb database",
        command: "docker exec avise-api-postgres-1 createdb -h localhost -U postgres spicedb",
      });
    } else {
      this.spinner!.stop("spicedb exists!");
    }
  }
}

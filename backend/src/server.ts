import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => console.log(`MiniLedger API listening on http://localhost:${env.PORT}`));

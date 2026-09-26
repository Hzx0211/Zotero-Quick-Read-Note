import { config } from "../package.json";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";

class Addon {
  data = {
    alive: true,
    config,
    env: __env__,
    initialized: false,
    ztoolkit: createZToolkit(),
  };

  hooks = hooks;
  api = {};
}

export default Addon;

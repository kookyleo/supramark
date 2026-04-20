#!/usr/bin/env node
import { main } from '../src/cli.ts';
const code = await main();
process.exit(code);

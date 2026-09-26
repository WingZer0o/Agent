# Agent

Local Ollama tool-calling loop. It asks `qwen3.8` to compute `(11434+12341)*412` with `add` and
`multiply`.

## Prerequisites

- Deno 2.x
- Ollama listening locally, with the `qwen3.8` model pulled (`ollama pull qwen3.8`)

## Run

```sh
deno task start
```

`deno task dev` runs the same loop with `--watch`.

The client uses `http://127.0.0.1:11434` unless `OLLAMA_HOST` is set (a host:port or a full URL both
work):

```sh
OLLAMA_HOST=http://127.0.0.1:11434 deno task start
```

`start` and `dev` only allow network access to `127.0.0.1:11434` and `localhost:11434`. Pointing
`OLLAMA_HOST` at any other address also means adding that host to `--allow-net` on those tasks.

## Checks

```sh
deno task check
deno task lint
deno task fmt
deno task test
```

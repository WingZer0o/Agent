import ollama from 'ollama'

type ToolName = 'add' | 'multiply'

function add(a: number, b: number): number {
  return a + b
}

function multiply(a: number, b: number): number {
  return a * b
}

const availableFunctions: Record<ToolName, (a: number, b: number) => number> = {
  add,
  multiply,
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'add',
      description: 'Add two numbers',
      parameters: {
        type: 'object',
        required: ['a', 'b'],
        properties: {
          a: { type: 'integer', description: 'The first number' },
          b: { type: 'integer', description: 'The second number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'multiply',
      description: 'Multiply two numbers',
      parameters: {
        type: 'object',
        required: ['a', 'b'],
        properties: {
          a: { type: 'integer', description: 'The first number' },
          b: { type: 'integer', description: 'The second number' },
        },
      },
    },
  },
]

async function agentLoop() {
  const messages = [{ role: 'user', content: 'What is (11434+12341)*412?' }]

  while (true) {
    const response = await ollama.chat({
      model: 'qwen3.8',
      messages,
      tools,
      think: true,
    })

    messages.push(response.message)
    console.log('Thinking:', response.message.thinking)
    console.log('Content:', response.message.content)

    const toolCalls = response.message.tool_calls ?? []
    if (toolCalls.length) {
      for (const call of toolCalls) {
        const fn = availableFunctions[call.function.name as ToolName]
        if (!fn) {
          continue
        }

        const args = call.function.arguments as { a: number; b: number }
        console.log(`Calling ${call.function.name} with arguments`, args)
        const result = fn(args.a, args.b)
        console.log(`Result: ${result}`)
        messages.push({ role: 'tool', tool_name: call.function.name, content: String(result) })
      }
    } else {
      break
    }
  }
}

agentLoop().catch(console.error)
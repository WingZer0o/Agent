import { assertEquals } from '@std/assert'
import { agentLoop, type ChatClient } from './index.ts'
import type { Message } from 'ollama'

function assistant(message: Message): { message: Message } {
  return { message }
}

Deno.test('agent loop runs add and multiply, skips unknown tools, then stops', async () => {
  const requests: Array<{
    model: string
    think: boolean
    toolNames: Array<string | undefined>
    messages: Message[]
  }> = []

  const client: ChatClient = {
    chat(request) {
      const messages = structuredClone(request.messages)
      requests.push({
        model: request.model,
        think: request.think,
        toolNames: request.tools.map((tool) => tool.function.name),
        messages,
      })

      const toolMessages = messages.filter((message) => message.role === 'tool')
      if (toolMessages.length === 0) {
        return Promise.resolve(assistant({
          role: 'assistant',
          content: '',
          thinking: 'add the operands first',
          tool_calls: [
            { function: { name: 'subtract', arguments: { a: 1, b: 1 } } },
            { function: { name: 'add', arguments: { a: 11434, b: 12341 } } },
          ],
        }))
      }

      if (toolMessages.length === 1) {
        return Promise.resolve(assistant({
          role: 'assistant',
          content: '',
          thinking: 'multiply the sum',
          tool_calls: [
            { function: { name: 'multiply', arguments: { a: 23775, b: 412 } } },
          ],
        }))
      }

      return Promise.resolve(assistant({
        role: 'assistant',
        content: '9795300',
        thinking: 'done',
      }))
    },
  }

  await agentLoop(client)

  assertEquals(requests.length, 3)
  for (const request of requests) {
    assertEquals(request.model, 'qwen3.8')
    assertEquals(request.think, true)
    assertEquals(request.toolNames, ['add', 'multiply'])
  }

  assertEquals(requests[0].messages, [{
    role: 'user',
    content: 'What is (11434+12341)*412?',
  }])

  assertEquals(
    requests[1].messages.filter((message) => message.role === 'tool'),
    [{ role: 'tool', tool_name: 'add', content: '23775' }],
  )

  assertEquals(
    requests[2].messages.filter((message) => message.role === 'tool'),
    [
      { role: 'tool', tool_name: 'add', content: '23775' },
      { role: 'tool', tool_name: 'multiply', content: '9795300' },
    ],
  )
})

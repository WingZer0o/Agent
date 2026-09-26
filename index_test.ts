import { assertEquals } from '@std/assert'
import { AIMessage, AIMessageChunk, type BaseMessage } from '@langchain/core/messages'
import type { ToolCall } from '@langchain/core/messages/tool'
import { FakeStreamingChatModel } from '@langchain/core/utils/testing'
import { agentLoop, createChatModel } from './index.ts'

type Step = {
  content: string
  toolCalls?: ToolCall[]
}

// invoke() always reads responses[0] and chunks[0].tool_calls, so each access
// yields the next scripted step from those two indexes.
function scriptedModel(steps: Step[]): FakeStreamingChatModel {
  let index = 0
  const current = () => steps[Math.min(index, steps.length - 1)]

  const responses = [] as BaseMessage[]
  Object.defineProperty(responses, '0', {
    get() {
      return new AIMessage({ content: current().content })
    },
  })

  const chunks = [] as AIMessageChunk[]
  Object.defineProperty(chunks, '0', {
    get() {
      const step = current()
      index += 1
      return new AIMessageChunk({
        content: step.content,
        tool_calls: step.toolCalls,
      })
    },
  })

  return new FakeStreamingChatModel({ responses, chunks, sleep: 0 })
}

Deno.test('chat model is qwen3.8 with thinking on the given host', () => {
  const model = createChatModel('http://127.0.0.1:11434')
  assertEquals(model.model, 'qwen3.8')
  assertEquals(model.baseUrl, 'http://127.0.0.1:11434')
  assertEquals(model.think, true)
})

Deno.test('agent loop runs add and multiply, skips unknown tools, then stops', async () => {
  const logs: unknown[][] = []
  const original = console.log
  console.log = (...args: unknown[]) => {
    logs.push(args)
  }

  const model = scriptedModel([
    {
      content: '',
      toolCalls: [
        { name: 'subtract', args: { a: 1, b: 1 }, id: 'call_subtract', type: 'tool_call' },
        { name: 'add', args: { a: 11434, b: 12341 }, id: 'call_add', type: 'tool_call' },
      ],
    },
    {
      content: '',
      toolCalls: [
        { name: 'multiply', args: { a: 23775, b: 412 }, id: 'call_multiply', type: 'tool_call' },
      ],
    },
    { content: '9795300' },
  ])

  try {
    await agentLoop(model)
  } finally {
    console.log = original
  }

  assertEquals(logs, [
    ['Thinking:', undefined],
    ['Content:', ''],
    ['Calling add with arguments', { a: 11434, b: 12341 }],
    ['Result: 23775'],
    ['Thinking:', undefined],
    ['Content:', ''],
    ['Calling multiply with arguments', { a: 23775, b: 412 }],
    ['Result: 9795300'],
    ['Thinking:', undefined],
    ['Content:', '9795300'],
  ])
})

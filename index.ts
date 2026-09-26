import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { type BaseMessage, HumanMessage, ToolMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import { ChatOllama } from '@langchain/ollama'
import * as z from 'zod'

type ToolCallingModel = BaseChatModel & {
  bindTools: NonNullable<BaseChatModel['bindTools']>
}

type ToolName = 'add' | 'multiply'

const numberPair = {
  a: z.number().int().describe('The first number'),
  b: z.number().int().describe('The second number'),
}

const add = tool(({ a, b }: { a: number; b: number }) => a + b, {
  name: 'add',
  description: 'Add two numbers',
  schema: z.object(numberPair),
})

const multiply = tool(({ a, b }: { a: number; b: number }) => a * b, {
  name: 'multiply',
  description: 'Multiply two numbers',
  schema: z.object(numberPair),
})

const tools = [add, multiply]

const toolsByName: Record<ToolName, typeof add | typeof multiply> = {
  add,
  multiply,
}

function isToolName(name: string): name is ToolName {
  return Object.hasOwn(toolsByName, name)
}

const defaultHost = 'http://127.0.0.1:11434'

export function createChatModel(baseUrl: string): ChatOllama {
  return new ChatOllama({
    model: 'qwen3.8',
    baseUrl,
    think: true,
  })
}

export async function agentLoop(model: ToolCallingModel): Promise<void> {
  const messages: BaseMessage[] = [new HumanMessage('What is (11434+12341)*412?')]
  const modelWithTools = model.bindTools(tools)

  while (true) {
    const response = await modelWithTools.invoke(messages)
    messages.push(response)

    console.log('Thinking:', response.additional_kwargs.reasoning_content)
    console.log('Content:', response.content)

    const toolCalls = response.tool_calls ?? []
    if (toolCalls.length === 0) {
      break
    }

    for (const call of toolCalls) {
      if (!isToolName(call.name)) {
        continue
      }

      const args = call.args as { a: number; b: number }
      console.log(`Calling ${call.name} with arguments`, args)
      const result = await toolsByName[call.name].invoke(args)
      console.log(`Result: ${result}`)
      messages.push(
        new ToolMessage({
          content: String(result),
          tool_call_id: call.id ?? call.name,
          name: call.name,
        }),
      )
    }
  }
}

if (import.meta.main) {
  const baseUrl = Deno.env.get('OLLAMA_HOST') || defaultHost
  agentLoop(createChatModel(baseUrl)).catch(console.error)
}

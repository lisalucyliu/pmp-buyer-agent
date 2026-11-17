// FAKE CLAUDE CLIENT for free tests. It never calls the API.
// It has the one method the server uses, api.beta.messages.stream(request), and plays back scripted
// responses in order. Each response: { content: [{ type: 'text', text } | { type: 'tool_use', name, input }],
// stop_reason } or a function (request) => response. It records every request it gets.

let nextBlockId = 1;

function fakeStream(response) {
  const content = response.content.map((block) =>
    block.type === 'tool_use' ? { id: `toolu_fake_${(nextBlockId += 1)}`, ...block } : block);
  const message = {
    id: `msg_fake_${(nextBlockId += 1)}`,
    type: 'message',
    role: 'assistant',
    model: response.model ?? 'claude-sonnet-5-5',
    content,
    stop_reason: response.stop_reason ?? (content.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn'),
    usage: response.usage ?? { input_tokens: 1000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 50 },
  };
  if (response.throws) {
    return {
      async *[Symbol.asyncIterator]() { throw response.throws; },
      finalMessage: async () => { throw response.throws; },
      abort() {},
    };
  }
  const events = [{ type: 'message_start', message: { ...message, content: [] } }];
  content.forEach((block, index) => {
    if (block.type === 'text') {
      events.push({ type: 'content_block_start', index, content_block: { type: 'text', text: '' } });
      for (const piece of block.text.match(/.{1,12}/gs) ?? []) events.push({ type: 'content_block_delta', index, delta: { type: 'text_delta', text: piece } });
    } else {
      events.push({ type: 'content_block_start', index, content_block: { ...block, input: {} } });
    }
    events.push({ type: 'content_block_stop', index });
  });
  events.push({ type: 'message_delta', delta: { stop_reason: message.stop_reason }, usage: { output_tokens: message.usage.output_tokens } });
  events.push({ type: 'message_stop' });
  return {
    async *[Symbol.asyncIterator]() { yield* events; },
    finalMessage: async () => message,
    abort() {},
  };
}

export function fakeClaude(responses) {
  const requests = [];
  let index = 0;
  return {
    requests,
    get callCount() { return requests.length; },
    beta: {
      messages: {
        stream(request) {
          requests.push(structuredClone(request));
          const next = responses[index];
          index += 1;
          if (!next) throw new Error(`Fake Claude has no response for call ${index}`);
          return fakeStream(typeof next === 'function' ? next(request) : next);
        },
      },
    },
  };
}

export const say = (text) => ({ content: [{ type: 'text', text }] });
export const useTool = (name, input) => ({ content: [{ type: 'tool_use', name, input }] });

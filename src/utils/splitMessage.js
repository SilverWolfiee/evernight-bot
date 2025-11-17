export function splitMessage(text, limit = 2000) {
  const chunks = [];
  let buffer = "";
  const lines = text.split("\n");
  for (const line of lines) {
    if (buffer.length + line.length + 1 > limit) {
      chunks.push(buffer);
      buffer = "";
    }
    buffer += (buffer ? "\n" : "") + line;
  }
  if (buffer) chunks.push(buffer);

  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.length <= limit) {
      finalChunks.push(chunk);
      continue;
    }
    let temp = "";
    const words = chunk.split(/(\s+)/);
    for (const word of words) {
      if (temp.length + word.length > limit) {
        finalChunks.push(temp.trimEnd());
        temp = "";
      }
      temp += word;
    }
    if (temp) finalChunks.push(temp.trimEnd());
  }

  for (let i = 0; i < finalChunks.length; i++) {
    const countTicks = (finalChunks[i].match(/```/g) || []).length;
    if (countTicks % 2 !== 0) {
      finalChunks[i] += "\n```";
      if (i + 1 < finalChunks.length && !finalChunks[i + 1].startsWith("```")) {
        finalChunks[i + 1] = "```\n" + finalChunks[i + 1];
      }
    }
  }
  return finalChunks;
}
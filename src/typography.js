// Apply only to interface copy, never to user names or input values.
export function typograph(text) {
  const shortWords = /(^|[\s«(])((?:а|в|во|и|к|ко|о|об|с|со|у|я|от|до|из|за|на|не|но|по|же|бы|мы|ты|он|вы|без|для|над|под|при|про))[ \t]+(?=\S)/giu;
  // A second pass joins chains such as «и с Политикой».
  return String(text).replace(shortWords, '$1$2\u00a0').replace(shortWords, '$1$2\u00a0');
}

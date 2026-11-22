/**
 * The slim rail's server tile: up to two letters or digits for a server name, uppercased like core's account avatar
 * ("My Craft" is MC, "Survival" SU), as a quoted CSS string for `content: var(...)`. Only letters and digits get in,
 * so nothing in the user's name needs escaping; `""` for a name without any.
 */
export function railInitials(name: string): string {
  const words = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const letters = words.length > 1 ? [...words[0]][0] + [...words[1]][0] : [...(words[0] ?? '')].slice(0, 2).join('');
  return `"${letters.toUpperCase()}"`;
}

import { ReadLineOptions } from 'node:readline'
//@ts-ignore
import read_ from 'read'
export interface ReadOptions<T extends string | number = string> {
  default?: T
  input?: ReadLineOptions['input'] & {
    isTTY?: boolean
  }
  output?: ReadLineOptions['output'] & {
    isTTY?: boolean
  }
  prompt?: string
  silent?: boolean
  timeout?: number
  edit?: boolean
  terminal?: boolean
  replace?: string
}

export type ReadMethod<T extends string | number = string> = (
  options: ReadOptions<T>,
) => Promise<T | string>

/**
 * just a re-export of the `read` module, but with
 * the types specified
 */
export async function read<T extends string | number = string>(
  options: ReadOptions<T>,
): Promise<T | string> {
  return (read_ as ReadMethod<T>)(options)
}

import './fixtures/chalk.js'

import t from 'tap'

import { render } from 'ink-testing-library'
import React from 'react'
import { Stack } from '../dist/esm/stack.js'

// output generated from the @tapjs/stack parser test fixture
const stack = [
  'Object.[foo] (__dirname/generate-parse-fixture.js:420:69)',
  'Object.<anonymous> (__dirname/generate-parse-fixture.js:420:69)',
  'Module._compile (module.js:571:32)',
  'Object.Module._extensions..js (module.js:580:10)',
  'Module.load (module.js:488:32)',
  'tryModuleLoad (module.js:447:12)',
  'Function.Module._load (module.js:439:3)',
  'Module.runMain (module.js:605:10)',
  'run (bootstrap_node.js:418:7)',
  'startup (bootstrap_node.js:139:9)',
  'Object.asdf ][)( \u0000\u0001\u0002\u0003\u001b[44;37m foo (__dirname/generate-parse-fixture.js:420:69)',
  'Object.asdf (__dirname/generate-parse-fixture.js:420:69)',
  'Object.eval (__dirname/generate-parse-fixture.js:420:69)',
  'eval (eval at <anonymous> (__dirname/generate-parse-fixture.js:420:69), <anonymous>:1:5)',
  'Object.a (s) d [f] (__dirname/generate-parse-fixture.js:420:69)',
  'eval (eval at fooeval (a file with eval .js:1:23), <anonymous>:1:5)',
  'fooeval (a file with eval .js:1:23)',
  'a file with eval .js:1:41',
  'ContextifyScript.Script.runInContext (vm.js:32:29)',
  'ContextifyScript.Script.runInNewContext (vm.js:38:15)',
  'Object.exports.runInNewContext (vm.js:69:17)',
  'eval (eval at <anonymous> (a file with eval .js:1:1), <anonymous>:1:5)',
  'a file with eval .js:1:1',
  'Object.function ctor (file.js:1:2)     <anonymous> (__dirname/generate-parse-fixture.js:420:69)',
  'eval (eval at <anonymous> (__dirname/generate-parse-fixture.js:420:69), <anonymous>:3:5)',
  'Object.[Symbol.iterator] (__dirname/generate-parse-fixture.js:420:69)',
  'Classy.[Symbol.iterator] (__dirname/generate-parse-fixture.js:420:69)',
  '[some (weird) [<symbolism>]] (__dirname/generate-parse-fixture.js:420:69)',
  'Object.[some (weird) [<symbolism>]] [as foo] (__dirname/generate-parse-fixture.js:420:69)',
  'OtherClass.[some (weird) [<symbolism>]] [as foo] (__dirname/generate-parse-fixture.js:420:69)',
  'Object.a (w) [<s>] (__dirname/generate-parse-fixture.js:420:69)',
  'evalmachine.<anonymous>:1:17',
  'x (     f[i](l<e>:.js:1:2)    :1:33)',
  '     f[i](l<e>:.js:1:2)    :2:1',
  'new Foo (__dirname/generate-parse-fixture.js:420:69)',
  'arr.map.n (__dirname/generate-parse-fixture.js:420:69)',
  'Array.map (native)',
  'native',
  'some/file.js:1:2',
  'dist/file.js:100:200 (src/file.ts:50:60)',
  'blorp (src/file.ts:50:60)',
  'blorp (dist/file.js:100:200) (src/file.ts:50:60)',
  'SomeObject.blorp (dist/file.js:100:200) (src/file.ts:50:60)',
  'Cls.[foo (paren) weird] (file.ts:1:3)',
  '[(funky:433:42)] (eval at Object.evalError (test/fixtures/eval-error.js:9:5) (test/fixtures/eval-error.ts:7:3), <anonymous>:99:22 (<anonymous>:2:9))',
  'Object.[some (weird) [<symbolism>]] [as foo] (__dirname/generate-parse-fixture.js:420:69)',
  'Foo.get stringStack (test/fixtures/eval-call-site.ts:17:33)',
  'NotMine.doSomething (/absolute/path/to/file.js:10:32) (/absolute/path/to/source.ts:88:99)',
  'Mine.doSomething (relative/path/to/file.js:10:32) (relative/path/to/source.ts:88:99)',
  '[(remote:433:42)] (eval at Object.evalError (/absolute/test/fixtures/eval-error.js:9:5) (/absolute/test/fixtures/eval-error.ts:7:3), <anonymous>:99:22 (<anonymous>:2:9))',
  'WHEN I WROTE the following pages, or rather the bulk of them, I lived alone, in the woods, a mile from any neighbor, in a house which I had built myself, on the shore of Walden Pond, in Concord, Massachusetts, and earned my living by the labor of my hands only. I lived there two years and two months. At present I am a sojourner in civilized life again. (walden:1:1)',
]
  .map(l => `${l}\n`)
  .join('')

t.test('show a stack', async t => {
  const app = render(<Stack stack={stack} />)
  t.matchSnapshot(app.lastFrame())
})

t.test('dont show for nuthin', async t => {
  const app = render(<Stack stack={''} />)
  t.equal(app.lastFrame(), '')
})

t.test('internal only', async t => {
  const app = render(
    <Stack stack="node:path:1:2\nObject.openSync (node:fs:573:18)" />,
  )
  t.equal(app.lastFrame(), '')
})

t.test(
  'show just the string if it does not look like a stack',
  async t => {
    const stack = `But men labor under a mistake. The better part of the man is soon plowed
into the soil for compost. By a seeming fate, commonly called necessity, they
are employed, as it says in an old book, laying up treasures which moth and
rust will corrupt and thieves break through and steal. It is a fool's life,
as they will find when they get to the end of it, if not before. It is said
that Deucalion and Pyrrha created men by throwing stones over their heads
behind them:

Inde genus durum sumus, experiensque laborum, Et documenta damus qua simus
origine nati.

Or, as Raleigh rhymes it in his sonorous way,

"From thence our kind hard-hearted is, enduring pain and care, Approving that
our bodies of a stony nature are."
`
    const app = render(<Stack stack={stack} />)
    t.matchSnapshot(app.lastFrame())
  },
)

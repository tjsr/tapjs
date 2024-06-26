'use strict'
import fs from 'fs'
import http from 'http'
import fetch from 'node-fetch'
import path, { resolve } from 'path'
import tap, { Test } from 'tap'
import { fileURLToPath } from 'url'
import { plugin } from '../dist/esm/index.js'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const t = tap.applyPlugin(plugin)

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'content-type': 'application/json',
    connection: 'close',
  })
  res.end(
    JSON.stringify({
      hello: req.url === '/' ? 'world' : String(req.url).slice(1),
    }),
  )
})

const flushSnapshots = () => {
  fs.rmSync(path.resolve(__dirname, '../tap-snapshots'), {
    force: true,
    recursive: true,
  })
}

t.afterEach(flushSnapshots)
t.beforeEach(flushSnapshots)

t.test('throws when snapshot file does not exist', async t => {
  const noDataTest = new Test({
    name: 'snapshots disabled, no data',
    writeSnapshot: false,
  }).applyPlugin(plugin)

  t.throws(() => noDataTest.nock.snapshot(), {
    message: /Missing snapshot data for test/,
    code: 'EMISSINGSNAPSHOT',
    at: {
      fileName: /test[\\\/]snapshot\.mts$/,
    },
  })
})

t.test(
  'throws when snapshot file exists, but does not contain snapshots for test',
  async t => {
    server.listen({ host: '127.0.0.1', port: 65200 })
    t.teardown(() => server.close())
    t.on('bailout', () => server.close())

    const dir = t.testdir()
    const sf = resolve(dir, 'snapshot.test.cjs')
    const writeTest = new Test({
      name: 'dummy write snapshot test',
      writeSnapshot: true,
      snapshotFile: sf,
    }).applyPlugin(plugin)
    writeTest.test('child test', async t => {
      t.nock.snapshot()
      await t.resolves(async () => {
        const res = await fetch('http://127.0.0.1:65200')
        t.equal(res.status, 200)
        const body = await res.json()
        t.same(body, { hello: 'world' })
      }, 'real request worked')
    })
    writeTest.end()
    await writeTest.concat()
    t.ok(writeTest.results?.ok, 'writeTest passed')

    const snapshotFile = writeTest.snapshotFile.replace(
      /\.test\.cjs$/,
      '.nock.json',
    )
    t.ok(fs.existsSync(snapshotFile), 'snapshot file was written')
    const snapshotData = JSON.parse(
      fs.readFileSync(snapshotFile, 'utf8'),
    )
    t.equal(
      Object.keys(snapshotData).length,
      1,
      'snapshot has one entry',
    )
    const snapshotKey = Object.keys(snapshotData)[0]
    t.equal(
      snapshotData[snapshotKey].length,
      1,
      'snapshot entry has one scope',
    )

    // the 'name' here must be different than the test above
    const readTest = new Test({
      name: 'read snapshot',
      writeSnapshot: false,
      snapshotFile: sf,
    }).applyPlugin(plugin)
    t.throws(() => readTest.nock.snapshot(), {
      message: /Missing snapshot data for test/,
      code: 'EMISSINGSNAPSHOT',
      at: {
        fileName: /test[\\\/]snapshot\.mts$/,
      },
    })
  },
)

t.test('snapshots work', async t => {
  // start a server
  server.listen({ host: '127.0.0.1', port: 65200 })
  t.teardown(() => server.close())

  const dir = t.testdir()
  const sf = resolve(dir, 'snapshot.test.cjs')

  // snapshot its response in a test
  const writeTest = new Test({
    name: 'snapshot works',
    writeSnapshot: true,
    snapshotFile: sf,
  }).applyPlugin(plugin)
  writeTest.nock.snapshot()

  await writeTest.resolves(async () => {
    const res = await fetch('http://127.0.0.1:65200')
    writeTest.equal(res.status, 200, 'got a 200')
    const body = await res.json()
    writeTest.same(body, { hello: 'world' }, 'got response body')
  }, 'real request worked')

  writeTest.end()
  t.ok(writeTest.results?.ok, 'writeTest passed')

  const snapshotFile = writeTest.snapshotFile.replace(
    /\.test\.cjs$/,
    '.nock.json',
  )
  t.ok(fs.existsSync(snapshotFile), 'snapshot file was written')

  // now stop the server
  server.close()

  // and see if we can load the snapshot for this test
  const readTest = new Test({
    name: 'snapshot works',
    writeSnapshot: false,
    snapshotFile: sf,
  }).applyPlugin(plugin)
  t.equal(
    readTest.snapshotFile,
    writeTest.snapshotFile,
    'uses the same file',
  )
  readTest.nock.snapshot()

  await readTest.resolves(async () => {
    const afterRes = await fetch('http://127.0.0.1:65200')
    t.equal(afterRes.status, 200, 'got a 200')
    const afterBody = await afterRes.json()
    t.same(afterBody, { hello: 'world' }, 'got response body')
  }, 'nock request worked')

  readTest.end()
  t.ok(readTest.results?.ok, 'readTest passed')
})

t.test('snapshots work with transforms', async t => {
  // start a server
  server.listen({ host: '127.0.0.1', port: 65200 })
  t.teardown(() => server.close())

  // snapshot its response in a test
  const writeTest = new Test({
    name: 'snapshot works',
    writeSnapshot: true,
  }).applyPlugin(plugin)
  const writeScopes = writeTest.nock.snapshot({
    clean: scope => {
      // remove the Date header
      const s = scope as typeof scope & {
        rawHeaders: string[]
      }
      const dateIdx = s.rawHeaders.indexOf('Date')
      s.rawHeaders.splice(dateIdx, 2)
      return s
    },
  })
  t.same(
    writeScopes,
    [],
    't.nock.snapshot() returns an empty array in write mode',
  )

  await writeTest.resolves(async () => {
    const res = await fetch('http://127.0.0.1:65200')
    writeTest.equal(res.status, 200, 'got a 200')
    writeTest.ok(res.headers.has('date'), 'has a date header')
    const body = await res.json()
    writeTest.same(body, { hello: 'world' }, 'got response body')
  }, 'real request worked')

  writeTest.end()
  t.ok(writeTest.results?.ok, 'writeTest passed')

  const snapshotFile = writeTest.snapshotFile.replace(
    /\.test\.cjs$/,
    '.nock.json',
  )
  t.ok(fs.existsSync(snapshotFile), 'snapshot file was written')

  // now stop the server
  server.close()

  // and see if we can load the snapshot for this test
  const readTest = new Test({
    name: 'snapshot works',
    writeSnapshot: false,
  }).applyPlugin(plugin)
  t.equal(
    readTest.snapshotFile,
    writeTest.snapshotFile,
    'uses the same file',
  )
  const readScopes = readTest.nock.snapshot({
    load: scope => {
      scope.reqheaders = { authorization: 'Bearer abcdef' }
      return scope
    },
  })
  t.equal(readScopes.length, 1, 'returned one scope')

  await readTest.rejects(
    async () => {
      await fetch('http://127.0.0.1:65200')
    },
    { code: 'ERR_NOCK_NO_MATCH' },
    'nock request without auth failed',
  )

  await readTest.resolves(async () => {
    const res = await fetch('http://127.0.0.1:65200', {
      headers: {
        authorization: 'Bearer abcdef',
      },
    })
    t.equal(res.status, 200, 'got a 200')
    t.notOk(
      res.headers.has('date'),
      'res does NOT have a date header',
    )
    const body = await res.json()
    t.same(body, { hello: 'world' }, 'got response body')
  }, 'nock request with auth worked')

  readTest.end()
  t.ok(readTest.results?.ok, 'readTest passed')
})

t.test('snapshots and nocks can co-exist', async t => {
  server.listen({ host: '127.0.0.1', port: 65200 })
  t.teardown(() => server.close())

  const runTests = async (writeSnapshot: boolean) => {
    const parentTest = new Test({ writeSnapshot }).applyPlugin(plugin)
    await parentTest.test(
      'test with snapshot',
      async snapshotTest => {
        snapshotTest.nock.snapshot()

        await snapshotTest.resolves(async () => {
          const res = await fetch('http://127.0.0.1:65200')
          t.equal(res.status, 200)
          const body = await res.json()
          t.same(body, { hello: 'world' })
        }, 'first snapshot request')

        await snapshotTest.test(
          'grandchild with nock',
          async grandchildTest => {
            grandchildTest
              .nock('http://127.0.0.1:65200')
              .get('/')
              .reply(200, { hello: 'grandchild' })

            const res = await fetch('http://127.0.0.1:65200')
            t.equal(res.status, 200)
            const body = await res.json()
            t.same(body, { hello: 'grandchild' })
          },
        )

        await snapshotTest.resolves(async () => {
          const res = await fetch('http://127.0.0.1:65200/snapshot')
          t.equal(res.status, 200)
          const body = await res.json()
          t.same(body, { hello: 'snapshot' })
        }, 'second snapshot request')

        await snapshotTest.test(
          'second grandchild with nock',
          async grandchildTest => {
            grandchildTest
              .nock('http://127.0.0.1:65200')
              .get('/')
              .reply(200, { hello: 'grandchild2' })

            const res = await fetch('http://127.0.0.1:65200')
            t.equal(res.status, 200)
            const body = await res.json()
            t.same(body, { hello: 'grandchild2' })
          },
        )
      },
    )

    await parentTest.test('test with nock', async nockTest => {
      nockTest
        .nock('http://127.0.0.1:65200')
        .get('/')
        .reply(200, { hello: 'nock' })

      const res = await fetch('http://127.0.0.1:65200')
      t.equal(res.status, 200)
      const body = await res.json()
      t.same(body, { hello: 'nock' })
    })

    parentTest.end()

    t.ok(parentTest.results?.ok, 'parentTest passed')
  }

  await t.resolves(runTests(true), 'tests run with snapshot enabled')
  server.close()
  await t.resolves(
    runTests(false),
    'tests run with snapshot disabled',
  )
})

t.test(
  'snapshots in interleaved tests are stored correctly',
  async t => {
    server.listen({ host: '127.0.0.1', port: 65200 })
    t.teardown(() => server.close())

    let snapshotFile!: string

    const runTests = async (writeSnapshot: boolean) => {
      const parentTest = new Test({
        name: 'parent test',
        writeSnapshot,
      }).applyPlugin(plugin)
      snapshotFile = parentTest.snapshotFile.replace(
        /\.test\.cjs$/,
        '.nock.json',
      )
      parentTest.nock.snapshot()

      await parentTest.resolves(async () => {
        const res = await fetch('http://127.0.0.1:65200/parent1')
        parentTest.equal(res.status, 200, 'got a 200')
        const body = await res.json()
        parentTest.same(
          body,
          { hello: 'parent1' },
          'got response body',
        )
      }, 'first parent request worked')

      await parentTest.test('child test', async childTest => {
        childTest.nock.snapshot()

        await childTest.resolves(async () => {
          const res = await fetch('http://127.0.0.1:65200/child1')
          childTest.equal(res.status, 200, 'got a 200')
          const body = await res.json()
          childTest.same(
            body,
            { hello: 'child1' },
            'got response body',
          )
        }, 'first child request worked')

        await childTest.test(
          'grandchild test',
          async grandchildTest => {
            grandchildTest.nock.snapshot()

            await grandchildTest.resolves(async () => {
              const res = await fetch(
                'http://127.0.0.1:65200/grandchild1',
              )
              grandchildTest.equal(res.status, 200, 'got a 200')
              const body = await res.json()
              grandchildTest.same(
                body,
                { hello: 'grandchild1' },
                'got response body',
              )
            }, 'first grandchild request worked')
          },
        )

        await childTest.resolves(async () => {
          const res = await fetch('http://127.0.0.1:65200/child2')
          childTest.equal(res.status, 200, 'got a 200')
          const body = await res.json()
          childTest.same(
            body,
            { hello: 'child2' },
            'got response body',
          )
        }, 'second child request worked')
      })

      await parentTest.resolves(async () => {
        const res = await fetch('http://127.0.0.1:65200/parent2')
        parentTest.equal(res.status, 200, 'got a 200')
        const body = await res.json()
        parentTest.same(
          body,
          { hello: 'parent2' },
          'got response body',
        )
      }, 'second parent request worked')

      await parentTest.test('second child test', async childTest => {
        childTest.nock.snapshot()

        await childTest.resolves(async () => {
          const res = await fetch('http://127.0.0.1:65200/child2.1')
          childTest.equal(res.status, 200)
          const body = await res.json()
          childTest.same(body, { hello: 'child2.1' })
        }, 'second child first request worked')
      })

      await parentTest.resolves(async () => {
        const res = await fetch('http://127.0.0.1:65200/parent3')
        parentTest.equal(res.status, 200, 'got a 200')
        const body = await res.json()
        parentTest.same(
          body,
          { hello: 'parent3' },
          'got response body',
        )
      }, 'third parent request worked')

      parentTest.end()
      t.ok(parentTest.results?.ok, 'parentTest passed')
    }

    await t.resolves(runTests(true), 'snapshot writing tests pass')

    t.ok(fs.existsSync(snapshotFile), 'snapshot file was written')
    server.close()

    await t.resolves(runTests(false), 'snapshot reading tests pass')
  },
)

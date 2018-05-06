'use strict'
const test = require('ava')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const agentFixtures = require('./fixtures/agent')

let single = Object.assign({}, agentFixtures.single)
let id = 1
let uuid = single.uuid

let config = {
  logging: function () {}
}

let uuidArgs = {
  where: { uuid }
}

let usernameArgs = {
  where: {
    username: 'platzi',
    connected: true
  }
}

let connectedArgs = {
  where: {connected: true}
}

let newAgent = {
  uuid: '123-123-123',
  name: 'test',
  username: 'test',
  hostname: 'test',
  pid: 0,
  connected: false
}

let MetricStub = {
  belongsTo: sinon.spy()
}

let AgentStub = null

let db = null

let sandbox = null

test.beforeEach(async () => {
  sandbox = sinon.sandbox.create()
  AgentStub = {
    hasMany: sandbox.spy(),
    findById: sandbox.stub(),
    findOne: sandbox.stub(),
    update: sandbox.stub(),
    create: sandbox.stub(),
    findAll: sandbox.stub()

  }

  AgentStub.create.withArgs(newAgent).returns(Promise.resolve({
    toJSON () { return newAgent }
  }))

  // Model findAll Stub
  AgentStub.findAll.withArgs().returns(Promise.resolve(agentFixtures.all))
  AgentStub.findAll.withArgs(connectedArgs).returns(Promise.resolve(agentFixtures.connected))
  AgentStub.findAll.withArgs(usernameArgs).returns(Promise.resolve(agentFixtures.platzi))
  // Finby
  AgentStub.findById.withArgs(id).returns(Promise.resolve(agentFixtures.byId(id)))
  // find One
  AgentStub.findOne.withArgs(uuidArgs).returns(Promise.resolve(agentFixtures.byUuid(uuid)))
  AgentStub.update.withArgs(single, uuidArgs).returns(Promise.resolve(single))

  const setupDatabase = proxyquire('../', {
    './models/agent': () => AgentStub,
    './models/metric': () => MetricStub
  })

  db = await setupDatabase(config)
})

test.afterEach(() => {
  sandbox && sandbox.restore()
})
test('Agent', t => {
  t.truthy(db.Agent, 'Agent Service Should exits')
})

// serial
test.serial('Setup', t => {
  t.true(AgentStub.hasMany.calledWith(MetricStub), 'Argument Should be the model Metric')
  t.true(AgentStub.hasMany.called, 'AgentModel.hasMany was executed')
  t.true(MetricStub.belongsTo.called, 'MetricModel.belongsTo was executed')
  t.true(MetricStub.belongsTo.calledWith(AgentStub), 'Agent should be the argument')
  t.true(AgentStub.hasMany.callCount === 1, 'Should be one')
  t.true(MetricStub.belongsTo.callCount === 1, 'Should be one')
})

test.serial('Agent#findById', async t => {
  let agent = await db.Agent.findById(id)

  t.true(AgentStub.findById.called, 'findById should be called')
  t.true(AgentStub.findById.calledOnce, 'findById should be called once')
  t.true(AgentStub.findById.calledWith(id), 'findById should be called with id')

  t.deepEqual(agent, agentFixtures.byId(id), 'should be the same ')
})

test.serial('Agent#createOrUpdate--exists', async t => {
  let agent = await db.Agent.createOrUpdate(single)

  t.true(AgentStub.findOne.called, 'Should be called')
  t.true(AgentStub.findOne.callCount === 2, 'Should be called twice')
  t.true(AgentStub.update.calledOnce, 'Should be called once')

  t.deepEqual(agent, single, 'agent should be the same')
})

test.serial('Agent#createOrUpdate--create', async t => {
  let agent = await db.Agent.createOrUpdate(newAgent)

  t.true(AgentStub.findOne.calledWith({
    where: {uuid: newAgent.uuid}
  }), 'Should be called with newAgent.uuid ')
  t.true(AgentStub.findOne.calledOnce, 'Should be called once')
  t.true(AgentStub.create.calledWith(newAgent), 'Should be called with newAgent')

  t.deepEqual(agent, newAgent, 'Should be the same')
})

test.serial('findAll#findConnected', async t => {
  let agents = await db.Agent.findConnected()

  t.true(AgentStub.findAll.calledOnce, 'Should be called once')
  t.true(AgentStub.findAll.calledWith(connectedArgs))

  t.deepEqual(agents, agentFixtures.connected)
})

test.serial('findAll#findByUserName', async t => {
  let agents = await db.Agent.findByUsername('platzi')
  t.true(AgentStub.findAll.called, 'Should be called')
  t.true(AgentStub.findAll.calledOnce, 'Should be called once')
  t.true(AgentStub.findAll.calledWith(usernameArgs))

  t.is(agents.length, agentFixtures.platzi.length, 'agents should be equal to agentFixtures.platzi')
  t.deepEqual(agents.shift(), single, 'Should be equal to single')
})

test.serial('findAll#all', async t => {
  let agents = await db.Agent.findAll()

  t.true(AgentStub.findAll.called, 'Shlould be called')
  t.true(AgentStub.findAll.calledOnce, 'Should be called once')
  t.true(AgentStub.findAll.calledWith(), 'Should be empty')

  t.deepEqual(agents, agentFixtures.all, 'Should be the same')
})

test.serial('findByUuid', async t => {
  let agent = await db.Agent.findByUuid(uuid)

  t.true(AgentStub.findOne.called, 'Should be called')
  t.true(AgentStub.findOne.calledOnce, 'Should be called once')
  t.true(AgentStub.findOne.calledWith(uuidArgs), 'Should be called with uuidArgs')

  t.deepEqual(agent, agentFixtures.byUuid(uuid), 'Should be the same')
})

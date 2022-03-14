const _ = require('lodash');

const AWS = require('aws-sdk');

const knexfileLoader = require('./knexfile');
const knex = require('knex');

// ----------------------Dynamo dumps----------------------
const projects = require('./downloaded_data/projects-production.json');
const experiments = require('./downloaded_data/experiments-production.json');
const samples = require('./downloaded_data/samples-production.json');
const userAccess = require('./downloaded_data/user-access-production.json');
const inviteAccess = require('./downloaded_data/invite-access-production.json');
const plots = require('./downloaded_data/plots-tables-production.json');
// ----------------------Dynamo dumps END------------------

const environments = { 
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
}

const activeEnvironment = environments.DEVELOPMENT;

const getSqlClient = async () => {
  const knexfile = await knexfileLoader(activeEnvironment);
  return knex.default(knexfile[activeEnvironment]);
}

const migrateProject = async (project) => {
  const { projectUuid, projects: projectData } = project;
  
  const experimentId = projectData.experiments[0];
  const experimentData = _.find(experiments, { 'experimentId': experimentId });

  const sampleData = _.find(samples, { 'experimentId': experimentId });

  console.log(`Migrating ${projectUuid}, experiment ${experimentId}`);

  if (_.isNil(projectData), _.isNil(experimentData), _.isNil(sampleData)) {
    console.log(`[ ERROR ] - ${experimentId} - One of these is nil:`);
    console.log(`projectData: ${projectData}, experimentData: ${experimentData}, sampleData: ${sampleData}`)
    return;
  }

  // SQL tables we will need to upload into:
  // 
  //  dynamo experiments and projects:
  //    - experiment
  //    - experiment_execution
  // 
  //  dynamo samples:
  //    - sample
  //    – sample_file
  //    - sample_to_sample_file_map
  //    - metadata_track
  //    - sample_in_metadata_track_map
  // 
  // Separate tables to insert into with their dynamo counterparts:
  // - invite_access
  // - user_access
  // - plot
  
  const sqlClient = await getSqlClient();

  const sqlExperiment = {
    id: experimentId,
    name: projectData.name,
    description: projectData.description,
    processing_config: experimentData.processingConfig,
    created_at: projectData.createdDate,
    updated_at: projectData.lastModified,
    notify_by_email: experimentData.notifyByEmail,
  };

  await sqlClient('experiment').insert(sqlExperiment);

  // Create experiment executions if we need to
  if (!_.isNil(experimentData.meta.gem2s)) {
    const { paramsHash, stateMachineArn, executionArn } = experimentData.meta.gem2s;

    const sqlExperimentExecution = {
      experiment_id: experimentId,
      pipeline_type: 'gem2s',
      params_hash: paramsHash,
      state_machine_arn: stateMachineArn,
      execution_arn: executionArn,
    };

    await sqlClient('experiment_execution').insert(sqlExperimentExecution);
  }

  if (!_.isNil(experimentData.meta.pipeline)) {
    const { paramsHash, stateMachineArn, executionArn } = experimentData.meta.pipeline;

    const sqlExperimentExecution = {
      experiment_id: experimentId,
      pipeline_type: 'qc',
      params_hash: paramsHash,
      state_machine_arn: stateMachineArn,
      execution_arn: executionArn,
    };

    await sqlClient('experiment_execution').insert(sqlExperimentExecution);
  }
}

const migrateUserAccess = async () => {
    userAccess[0].forEach(async (ua) => {
  });

  const sqlUserAccess = {
    user_id: ua.userId,
    experiment_id: ua.experimentId,
    access_role: ua.role,
    updated_at: ua.createdAt
    
  };

  await sqlClient('user_access').insert(sqlUserAccess);
}


const run = async () => {
  migrateProject(projects[0]);
  // projects.forEach(async (project) => {
  //   await migrateProject(project);
  // });
  await migrateUserAccess()
};

run()
  .then(() => console.log('finished'))
  .catch((e) => console.log(e));
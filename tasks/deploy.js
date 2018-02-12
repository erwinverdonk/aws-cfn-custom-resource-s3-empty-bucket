const AWS = require('aws-sdk');

AWS.config = new AWS.Config({ region: 'eu-west-1' });

const fs = require('fs');
const cf = new AWS.CloudFormation();
const cfTemplate = fs.readFileSync(__dirname + '/../lib/cloudformation.yaml');
const code = fs.readFileSync(__dirname + '/../lib/S3EmptyBucket.js');
const stackName = 'CFNCustomResource-S3EmptyBucket';

console.log(`Creation of CloudFormation stack '${stackName}' started`);
exports.default = cf.createStack({
  StackName: stackName,
  TemplateBody: cfTemplate.toString(),
  Capabilities: ['CAPABILITY_IAM'],
  Parameters: [
    {
      ParameterKey: 'Code',
      ParameterValue: code.toString(),
    },
  ],
})
.promise()
.then(_ => cf.waitFor('stackCreateComplete', { StackName: stackName }).promise())
.then(_ => console.log(`Creation of CloudFormation stack '${stackName}' finished`))
.catch(_ => {
  if (_.code === 'AlreadyExistsException') {
    console.log(`CloudFormation stack '${stackName}' already exists`);
    console.log(`Update of CloudFormation stack '${stackName}' started`);
    
    cf.updateStack({
      StackName: stackName,
      TemplateBody: cfTemplate.toString(),
      Capabilities: ['CAPABILITY_IAM'],
      Parameters: [
        {
          ParameterKey: 'Code',
          ParameterValue: code.toString(),
        },
      ],
    })
    .promise()
    .then(_ => cf.waitFor('stackUpdateComplete', { StackName: stackName }).promise())
    .then(_ => console.log(`Update of CloudFormation stack '${stackName}' finished`))
    .catch(_ => _.message.indexOf(('no updates').toLowerCase()) > -1
      ? console.error(_)
      : _
    );
  } else {
    console.error(_);
  }
});

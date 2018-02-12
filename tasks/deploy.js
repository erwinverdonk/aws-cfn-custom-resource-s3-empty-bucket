const AWS = require('aws-sdk');

AWS.config = new AWS.Config({ region: 'eu-west-1' });

const fs = require('fs');
const cf = new AWS.CloudFormation();
const cfTemplate = fs.readFileSync(__dirname + '/../lib/cloudformation.yaml');
const code = fs.readFileSync(__dirname + '/../lib/S3EmptyBucket.js');

console.log(`Creation of CloudFormation stack '${stackName}' started`);
exports.default = cf.createStack({
  StackName: 'CFNCustomResource-S3EmptyBucket',
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
    cf.updateStack({
      StackName: 'CFNCustomResource-S3EmptyBucket',
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

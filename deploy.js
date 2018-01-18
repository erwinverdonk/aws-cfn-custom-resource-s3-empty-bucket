const AWS = require('aws-sdk');
const fs = require('fs');
const cf = new AWS.CloudFormation();

AWS.config.update({ region: 'eu-west-1' });

const cfTemplate = fs.readFileSync('cloudformation.yaml');
const code = fs.readFileSync('handler.js');

cf.createStack({
  StackName: 'CloudFormationS3EmptyBucketFunction',
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
.catch(_ => {
  if (_.code === 'AlreadyExistsException') {
    cf.updateStack({
      StackName: 'CloudFormationS3EmptyBucketFunction',
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
    .catch(_ => console.error(_));
  } else {
    console.error(_);
  }
});

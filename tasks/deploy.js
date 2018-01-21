const AWS = require('aws-sdk');
AWS.config.update({ region: 'eu-west-1' });

const fs = require('fs');
const cf = new AWS.CloudFormation();
const cfTemplate = fs.readFileSync(__dirname + '/../lib/cloudformation.yaml');
const code = fs.readFileSync(__dirname + '/../lib/S3EmptyBucket.js');

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
    .catch(_ => _.message.indexOf(('no updates').toLowerCase()) > -1
      ? console.error(_)
      : _
    );
  } else {
    console.error(_);
  }
});

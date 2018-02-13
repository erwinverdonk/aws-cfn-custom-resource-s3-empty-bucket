exports.deploy = () => {
  const AWS = require('aws-sdk');

  AWS.config = new AWS.Config({ region: 'eu-west-1' });

  const fs = require('fs');
  const cf = new AWS.CloudFormation();
  const cfTemplate = fs.readFileSync(__dirname + '/../lib/cloudformation.yaml');
  const code = fs.readFileSync(__dirname + '/../lib/S3EmptyBucket.js');
  const stackName = 'CFNCustomResource-S3EmptyBucket';

  console.log(`Creation of CloudFormation stack '${stackName}' started`);
  return cf
    .createStack({
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
    .then(_ => ({ stackName, pendingResourceState: 'stackCreateComplete' }))
    .catch(_ => {
      if (_.code === 'AlreadyExistsException') {
        console.log(`CloudFormation stack '${stackName}' already exists`);
        console.log(`Update of CloudFormation stack '${stackName}' started`);

        return cf
          .updateStack({
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
          .then(_ => ({ stackName, pendingResourceState: 'stackUpdateComplete' }))
          .catch(_ => {
            if (_.message.toLowerCase().indexOf('no updates') > -1) {
              return { stackName, pendingResourceState: 'stackExists' };
            }

            throw _;
          });
      } else {
        throw _;
      }
    });
};

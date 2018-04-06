const AWS = require('aws-sdk');
const fs = require('fs');

const createWait = (cf, stackName, status) => () => cf.waitFor(status, {
  StackName: stackName
}).promise();

exports.deploy = () => {
  AWS.config = new AWS.Config({ region: 'eu-west-1' });

  const cf = new AWS.CloudFormation();
  const cfTemplate = fs.readFileSync(__dirname + '/../lib/cloudformation.yaml');
  const code = fs.readFileSync(__dirname + '/../lib/S3EmptyBucket.js');
  const stackName = 'CFNCustomResource-S3EmptyBucket';

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
    .then(_ => ({ wait: createWait(cf, stackName, 'stackCreateComplete') }))
    .catch(_ => {
      if (_.code === 'AlreadyExistsException') {
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
          .then(_ => ({ wait: createWait(cf, stackName, 'stackUpdateComplete') }))
          .catch(_ => {
            if (_.message.toLowerCase().indexOf('no updates') > -1) {
              return ({ wait: createWait(cf, stackName, 'stackExists') });
            }
            throw _;
          });
      } else {
        throw _;
      }
    });
};

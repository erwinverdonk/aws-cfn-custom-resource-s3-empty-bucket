exports.handler = (event, context, callback) => {
  const props = event.ResourceProperties;
  const AWS = require('aws-sdk');
  const HTTPS = require('https');
  const URL = require('url');
  const S3 = new AWS.S3();

  console.log('S3EmptyBucket: Data: ', event);
  console.log('S3EmptyBucket: Booting...');

  const empty = (keyMarker, versionIdMarker) => {
    return S3.listObjectVersions({
      Bucket: props.BucketName,
      KeyMarker: keyMarker,
      VersionIdMarker: versionIdMarker,
    })
    .promise()
    .then(listObjectsResult => {
      if (listObjectsResult.DeleteMarkers.length === 0 && listObjectsResult.Versions.length === 0) return;

      console.log('S3EmptyBucket: Objects listed for deletion:', listObjectsResult)

      S3.deleteObjects({
        Bucket: props.BucketName,
        Delete: {
          Objects: (listObjectsResult.DeleteMarkers.length > 0
            ? listObjectsResult.DeleteMarkers
            : listObjectsResult.Versions
          ).map(_ => ({
            Key: _.Key,
            VersionId: _.VersionId,
          })),
        },
      })
      .promise()
      .then(_ => {
        if (listObjectsResult.isTruncated) {
          return empty(listObjectsResult.NextKeyMarker, listObjectsResult.NextVersionIdMarker);
        } else if (_.Deleted.some(_ => _.DeleteMarker)) {
          return empty();
        }
      });
    });
  };

  const sendResponse = (event, context, responseStatus, responseData) => {
    const parsedUrl = URL.parse(event.ResponseURL);
    const responseBody = JSON.stringify({
      Status: responseStatus,
      Reason: 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
      PhysicalResourceId: context.logStreamName,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      Data: responseData
    });
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: 'PUT',
      headers: {
        'content-type': '',
        'content-length': responseBody.length
      }
    };

    const request = HTTPS.request(options, _ => callback(_));
    request.on('error', _ => callback(_));
    request.write(responseBody);
    request.end();
  };

  console.log('S3EmptyBucket: Making decision about request type:', event.RequestType);

  switch (event.RequestType) {
    case 'Delete':
      console.log('S3EmptyBucket: Start emptying S3 Bucket...');

      empty()
        .then(_ => {
          console.log('S3EmptyBucket: S3 bucket is successfully emptied.');
          return sendResponse(event, context, 'SUCCESS', _);
        })
        .catch(_ => {
          console.log('S3EmptyBucket: An error occured while emptying the S3 bucket.');
          return sendResponse(event, context, 'FAILED', _);
        });
      break;
    default:
      console.log('S3EmptyBucket: No actions to perform for current request type.');
      return sendResponse(event, context, 'SUCCESS');
  }
};

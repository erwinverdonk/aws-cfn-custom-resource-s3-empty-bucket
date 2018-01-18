exports.handler = (event, context, callback) => {
  const props = event.ResourceProperties;
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3();

  const empty = (keyMarker, versionIdMarker) => {
    return s3
      .listObjectVersions({
        Bucket: props.BucketName,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
      })
      .promise()
      .then(listObjectsResult => {
        if (listObjectsResult.DeleteMarkers.length === 0 && listObjectsResult.Versions.length === 0) return;

        s3
          .deleteObjects({
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

  switch (event.RequestType) {
    case 'Delete':
      empty()
        .then(_ => callback(null, _))
        .catch(_ => callback(_));
      break;
  }
};

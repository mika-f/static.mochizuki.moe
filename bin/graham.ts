#!/usr/bin/env node

import * as path from "path";

// import * as acm from "@aws-cdk/aws-certificatemanager";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3Deploy from "@aws-cdk/aws-s3-deployment";
import * as cdk from "@aws-cdk/cdk";

class GrahamStack extends cdk.Stack {
    constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
        super(parent, name, props);

        // DNS validation is not currently available in CloudFormation.
        /* 
        const certificate = new acm.Certificate(this, `Certificate-${name}`, {
            domainName: "*.mochizuki.moe"
        });
        */

        const bucket = new s3.Bucket(this, `${name}S3Bucket`, {
            bucketName: process.env.S3_BUCKET_NAME as string,
            websiteIndexDocument: "index.html",
            websiteErrorDocument: "error.html"
        });

        new s3Deploy.BucketDeployment(this, `${name}S3BucketDeployment`, {
            source: s3Deploy.Source.asset(path.resolve("./", "objects")),
            destinationBucket: bucket,
        });

        const originId = new cloudfront.cloudformation.CloudFrontOriginAccessIdentityResource(this, `${name}CloudFrontAccessIdentity`, {
            cloudFrontOriginAccessIdentityConfig: {
                comment: "accessed by static.mochizuki.moe"
            },
        });

        new cloudfront.CloudFrontWebDistribution(this, `${name}CloudFrontDistribution`, {
            aliasConfiguration: {
                acmCertRef: process.env.ACM_CERTIFICATE_ARN as string,
                names: [process.env.CLOUDFRONT_ALIAS_NAME as string],
                sslMethod: cloudfront.SSLMethod.SNI,
                securityPolicy: cloudfront.SecurityPolicyProtocol.TLSv1_2_2018,
            },
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: bucket,
                        // Need to set "Yes, Update Bucket Policy" at the CloudFront Console?
                        originAccessIdentity: originId,
                    },
                    behaviors: [
                        { isDefaultBehavior: true }
                    ]
                }
            ],
            priceClass: cloudfront.PriceClass.PriceClass200,
        });
    }
}

const app = new cdk.App();

new GrahamStack(app, "GrahamStack");

app.run();

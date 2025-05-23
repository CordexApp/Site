#!/bin/bash
set -e

# This script sets up an Application Load Balancer for your ECS service
# You should run this after vpc-setup.sh

# Enter the IDs from the vpc-setup.sh output
VPC_ID="vpc-0c83ba5fdd5521834"
PUBLIC_SUBNET_1_ID="subnet-070be253308485868"
PUBLIC_SUBNET_2_ID="subnet-07030ac5dcdbebd3d"
LB_SG_ID="sg-08bc9667823042ecb"
ECS_SG_ID="sg-08bc9667823042ecb"

# Set your AWS region
AWS_REGION="us-west-2"

# Create a target group
echo "Creating target group..."
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
  --name cordex-site-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)
echo "Target Group created: $TARGET_GROUP_ARN"

# Create an Application Load Balancer
echo "Creating Application Load Balancer..."
LOAD_BALANCER_ARN=$(aws elbv2 create-load-balancer \
  --name cordex-site-lb \
  --subnets $PUBLIC_SUBNET_1_ID $PUBLIC_SUBNET_2_ID \
  --security-groups $LB_SG_ID \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)
echo "Load Balancer created: $LOAD_BALANCER_ARN"

# Wait for the load balancer to be active
echo "Waiting for the load balancer to be active..."
aws elbv2 wait load-balancer-available \
  --load-balancer-arns $LOAD_BALANCER_ARN \
  --region $AWS_REGION

# Get the DNS name of the load balancer
LOAD_BALANCER_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $LOAD_BALANCER_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)
echo "Load Balancer DNS: $LOAD_BALANCER_DNS"

# Create a listener
echo "Creating listener..."
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $LOAD_BALANCER_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
  --region $AWS_REGION \
  --query 'Listeners[0].ListenerArn' \
  --output text)
echo "Listener created: $LISTENER_ARN"

# Check if the ECS service already exists
SERVICE_EXISTS=$(aws ecs describe-services \
  --cluster cordex-site-cluster \
  --services cordex-site-service \
  --region $AWS_REGION \
  --query 'services[0].status' \
  --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "$SERVICE_EXISTS" == "ACTIVE" ]; then
  # Update the existing ECS service to use the load balancer
  echo "Updating ECS service to use the load balancer..."
  aws ecs update-service \
    --cluster cordex-site-cluster \
    --service cordex-site-service \
    --network-configuration "awsvpcConfiguration={subnets=[$PUBLIC_SUBNET_1_ID,$PUBLIC_SUBNET_2_ID],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$TARGET_GROUP_ARN,containerName=site-container,containerPort=3000" \
    --region $AWS_REGION
  echo "ECS service updated!"
else
  # Create a new ECS service with the load balancer
  echo "Creating new ECS service with the load balancer..."
  aws ecs create-service \
    --cluster cordex-site-cluster \
    --service-name cordex-site-service \
    --task-definition cordex-site-task \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$PUBLIC_SUBNET_1_ID,$PUBLIC_SUBNET_2_ID],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$TARGET_GROUP_ARN,containerName=site-container,containerPort=3000" \
    --region $AWS_REGION
  echo "ECS service created!"
fi

# Update the GitHub Actions workflow file to include the new VPC and subnet IDs
echo "Updating GitHub Actions workflow file..."
cat > .github/workflows/aws-deploy.yml <<EOL
name: Deploy to Amazon ECS

on:
  push:
    branches:
      - main # Change this to your main branch name if different

env:
  AWS_REGION: us-west-2
  ECR_REPOSITORY: cordex-site
  ECS_CLUSTER: cordex-site-cluster
  ECS_SERVICE: cordex-site-service
  ECS_TASK_DEFINITION: task-definition.json
  CONTAINER_NAME: site-container
  CLOUDWATCH_LOG_GROUP: /ecs/cordex-site-task

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::471112508717:role/GitHubActionsECR-ECS
          aws-region: \${{ env.AWS_REGION }}

      - name: Ensure CloudWatch log group exists
        run: |
          aws logs describe-log-groups --log-group-name-prefix \${{ env.CLOUDWATCH_LOG_GROUP }} --region \${{ env.AWS_REGION }} || \\
          aws logs create-log-group --log-group-name \${{ env.CLOUDWATCH_LOG_GROUP }} --region \${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          # Build a docker container and push it to ECR
          docker build -t \$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG .
          docker push \$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG
          echo "image=\$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG" >> \$GITHUB_OUTPUT

      - name: Fill in the new image ID in the Amazon ECS task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: \${{ env.ECS_TASK_DEFINITION }}
          container-name: \${{ env.CONTAINER_NAME }}
          image: \${{ steps.build-image.outputs.image }}

      - name: Deploy Amazon ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: \${{ steps.task-def.outputs.task-definition }}
          service: \${{ env.ECS_SERVICE }}
          cluster: \${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
EOL

# Update the Next.js config
echo "Updating Next.js config for proper hostname handling..."
cat > next.config.ts <<EOL
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
  // Avoid DNS resolution issues in containers
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 500,
      };
    }
    return config;
  },
};

export default nextConfig;
EOL

echo ""
echo "===== Setup Complete ====="
echo "VPC ID: $VPC_ID"
echo "Target Group ARN: $TARGET_GROUP_ARN"
echo "Load Balancer ARN: $LOAD_BALANCER_ARN"
echo "Load Balancer DNS: $LOAD_BALANCER_DNS"
echo ""
echo "Your application will be available at: http://$LOAD_BALANCER_DNS"
echo "Note: It may take a few minutes for the DNS to propagate and the service to be healthy."
echo "===========================" 
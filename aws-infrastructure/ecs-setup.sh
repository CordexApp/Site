#!/bin/bash
set -e

# Set your AWS region
AWS_REGION="us-west-2"
ACCOUNT_ID="471112508717"

# Create CloudWatch log group for container logs
echo "Creating CloudWatch log group..."
aws logs create-log-group \
  --log-group-name /ecs/cordex-site-task \
  --region $AWS_REGION || true
echo "CloudWatch log group created or already exists"

# Create ECS cluster
echo "Creating ECS cluster..."
aws ecs create-cluster \
  --cluster-name cordex-site-cluster \
  --region $AWS_REGION || true
echo "ECS cluster created or already exists"

# Create ECR repository if it doesn't exist
echo "Creating ECR repository..."
aws ecr describe-repositories \
  --repository-names cordex-site \
  --region $AWS_REGION > /dev/null 2>&1 || \
aws ecr create-repository \
  --repository-name cordex-site \
  --region $AWS_REGION
echo "ECR repository created or already exists"

# Check if the task definition already exists
echo "Registering task definition..."
cat > task-definition.json <<EOL
{
  "family": "cordex-site-task",
  "networkMode": "awsvpc",
  "executionRoleArn": "arn:aws:iam::${ACCOUNT_ID}:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "site-container",
      "image": "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/cordex-site:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        },
        {
          "name": "HOSTNAME",
          "value": "0.0.0.0"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/cordex-site-task",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512"
}
EOL

# Register the task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION
echo "Task definition registered"

# Check if the service already exists - we'll skip creating it here
# and let the load-balancer-setup.sh script handle it with the proper load balancer configuration
SERVICE_EXISTS=$(aws ecs describe-services \
  --cluster cordex-site-cluster \
  --services cordex-site-service \
  --region $AWS_REGION \
  --query 'services[0].status' \
  --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "$SERVICE_EXISTS" == "DOES_NOT_EXIST" ]; then
  echo "Service will be created by the load-balancer-setup.sh script"
else
  echo "Service already exists and will be updated by the load-balancer-setup.sh script"
fi

echo ""
echo "===== ECS Setup Complete ====="
echo "ECS Cluster: cordex-site-cluster"
echo "Task Definition: cordex-site-task"
echo "ECR Repository: cordex-site"
echo ""
echo "Next steps:"
echo "1. Run vpc-setup.sh to create the networking infrastructure"
echo "2. Run load-balancer-setup.sh to create the load balancer and ECS service"
echo "===========================" 
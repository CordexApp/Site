#!/bin/bash
set -e

# Set your AWS region and GitHub repository details
AWS_REGION="us-west-2"
ACCOUNT_ID="471112508717"
GITHUB_REPO="CordexApp/Site"

# Create the OIDC provider for GitHub Actions
echo "Creating OIDC provider for GitHub Actions..."
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  --region $AWS_REGION || true  # ignore if already exists
echo "OIDC provider created or already exists"

# Create a role for GitHub Actions to assume
echo "Creating role for GitHub Actions..."
aws iam create-role \
  --role-name GitHubActionsECR-ECS \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::'$ACCOUNT_ID':oidc-provider/token.actions.githubusercontent.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
          },
          "StringLike": {
            "token.actions.githubusercontent.com:sub": "repo:'$GITHUB_REPO':*"
          }
        }
      }
    ]
  }' \
  --region $AWS_REGION || true  # ignore if already exists
echo "Role created or already exists"

# Create a policy for ECR and ECS access
echo "Creating policy for ECR and ECS access..."
aws iam create-policy \
  --policy-name GitHubActionsEcrEcsPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:GetAuthorizationToken"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService",
          "ecs:DescribeClusters",
          "ecs:ListClusters"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": "iam:PassRole",
        "Resource": "arn:aws:iam::'$ACCOUNT_ID':role/ecsTaskExecutionRole"
      },
      {
        "Effect": "Allow",
        "Action": [
          "logs:CreateLogGroup",
          "logs:DescribeLogGroups",
          "logs:PutRetentionPolicy"
        ],
        "Resource": "arn:aws:logs:*:'$ACCOUNT_ID':log-group:*"
      }
    ]
  }' \
  --region $AWS_REGION || echo "Policy already exists"

# Get the policy ARN
POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/GitHubActionsEcrEcsPolicy"

# Attach the policy to the role
echo "Attaching policy to role..."
aws iam attach-role-policy \
  --role-name GitHubActionsECR-ECS \
  --policy-arn $POLICY_ARN \
  --region $AWS_REGION || true  # ignore if already attached
echo "Policy attached to role"

echo ""
echo "===== GitHub OIDC Setup Complete ====="
echo "OIDC Provider: token.actions.githubusercontent.com"
echo "IAM Role: GitHubActionsECR-ECS"
echo "Policy: GitHubActionsEcrEcsPolicy"
echo ""
echo "Important: Make sure to update the GITHUB_REPO variable in this script"
echo "with your actual GitHub repository path (username/repo-name)"
echo "===========================" 
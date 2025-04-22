#!/bin/bash
set -e

# Set your AWS region
AWS_REGION="us-west-2"

# Create a VPC
echo "Creating VPC..."
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --region $AWS_REGION \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=cordex-vpc}]' \
  --query 'Vpc.VpcId' \
  --output text)
echo "VPC created: $VPC_ID"

# Enable DNS hostnames for the VPC
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames

# Create an Internet Gateway
echo "Creating Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway \
  --region $AWS_REGION \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=cordex-igw}]' \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)
echo "Internet Gateway created: $IGW_ID"

# Attach the Internet Gateway to the VPC
echo "Attaching Internet Gateway to VPC..."
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID \
  --region $AWS_REGION

# Create a public route table
echo "Creating public route table..."
PUBLIC_ROUTE_TABLE_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=cordex-public-rt}]' \
  --query 'RouteTable.RouteTableId' \
  --output text)
echo "Public Route Table created: $PUBLIC_ROUTE_TABLE_ID"

# Create a route to the Internet Gateway
echo "Adding route to Internet Gateway..."
aws ec2 create-route \
  --route-table-id $PUBLIC_ROUTE_TABLE_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID \
  --region $AWS_REGION

# Create public subnets across multiple AZs for high availability
echo "Creating public subnets..."
AZ1="us-west-2a"
AZ2="us-west-2b"

PUBLIC_SUBNET_1_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone $AZ1 \
  --region $AWS_REGION \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=cordex-public-subnet-1}]' \
  --query 'Subnet.SubnetId' \
  --output text)
echo "Public Subnet 1 created: $PUBLIC_SUBNET_1_ID in $AZ1"

PUBLIC_SUBNET_2_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone $AZ2 \
  --region $AWS_REGION \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=cordex-public-subnet-2}]' \
  --query 'Subnet.SubnetId' \
  --output text)
echo "Public Subnet 2 created: $PUBLIC_SUBNET_2_ID in $AZ2"

# Associate public subnets with the public route table
echo "Associating public subnets with public route table..."
aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_1_ID \
  --route-table-id $PUBLIC_ROUTE_TABLE_ID \
  --region $AWS_REGION

aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_2_ID \
  --route-table-id $PUBLIC_ROUTE_TABLE_ID \
  --region $AWS_REGION

# Enable auto-assign public IP for the public subnets
echo "Enabling auto-assign public IP for public subnets..."
aws ec2 modify-subnet-attribute \
  --subnet-id $PUBLIC_SUBNET_1_ID \
  --map-public-ip-on-launch

aws ec2 modify-subnet-attribute \
  --subnet-id $PUBLIC_SUBNET_2_ID \
  --map-public-ip-on-launch

# Create a security group for the load balancer
echo "Creating security group for the load balancer..."
LB_SG_ID=$(aws ec2 create-security-group \
  --group-name cordex-lb-sg \
  --description "Security group for Cordex load balancer" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --query 'GroupId' \
  --output text)
echo "Load Balancer Security Group created: $LB_SG_ID"

# Allow HTTP traffic to the load balancer
aws ec2 authorize-security-group-ingress \
  --group-id $LB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

# Create a security group for the ECS tasks
echo "Creating security group for ECS tasks..."
ECS_SG_ID=$(aws ec2 create-security-group \
  --group-name cordex-ecs-sg \
  --description "Security group for Cordex ECS tasks" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --query 'GroupId' \
  --output text)
echo "ECS Security Group created: $ECS_SG_ID"

# Allow traffic from the load balancer to the ECS tasks
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3000 \
  --source-group $LB_SG_ID \
  --region $AWS_REGION

# Output the resources created
echo ""
echo "===== Resources Created ====="
echo "VPC ID: $VPC_ID"
echo "Internet Gateway ID: $IGW_ID"
echo "Public Route Table ID: $PUBLIC_ROUTE_TABLE_ID"
echo "Public Subnet 1 ID: $PUBLIC_SUBNET_1_ID (AZ: $AZ1)"
echo "Public Subnet 2 ID: $PUBLIC_SUBNET_2_ID (AZ: $AZ2)"
echo "Load Balancer Security Group ID: $LB_SG_ID"
echo "ECS Security Group ID: $ECS_SG_ID"
echo "==========================="
echo ""
echo "You can now use these IDs to create your load balancer and ECS service." 
NAME := todoist-google-sheets
ENV := production

REGION = us-east-1

CLUSTER := integrations
REPO := 011833101604.dkr.ecr.$(REGION).amazonaws.com/$(NAME)

GIT_COMMIT := $(shell git rev-parse --short HEAD)

.PHONY: all $(MAKECMDGOALS)
.DEFAULT_GOAL := help

help:            ## Show this help.
	@fgrep -h "##" $(MAKEFILE_LIST) | fgrep -v fgrep | sed -e 's/\\$$//' | sed -e 's/##//'

repository:      ## Create container repository
	aws cloudformation deploy --region $(REGION) \
		--stack-name $(NAME)-$(ENV)-repository \
		--template-file aws/repository.yml

deploy:         ##  Deploy the cloudformation stack
	aws cloudformation deploy --region $(REGION) \
		--stack-name $(NAME)-$(ENV) \
		--template-file aws/cloudformation.yml \
		--tags \
			Environment=$(ENV) \
			Project=integrations \
		--capabilities CAPABILITY_NAMED_IAM \
		--parameter-overrides \
			Environment=$(ENV) \
			ContainerTag=$(GIT_COMMIT)

build:           ## Build a new container image localy
	docker build -t $(NAME):$(GIT_COMMIT) . \
		-f server.Dockerfile \
		--build-arg GH_PACKAGES_TOKEN=$(GH_PACKAGES_TOKEN)

push: build ecr-login  ## Push container image to the registry
	docker tag $(NAME):$(GIT_COMMIT) $(REPO):$(GIT_COMMIT)
	docker push $(REPO):$(GIT_COMMIT)

ecr-login:       ## Login to the registry
	aws ecr get-login-password --region $(REGION) | \
		docker login --username AWS --password-stdin $(REPO)

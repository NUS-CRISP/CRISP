pipeline {
    agent {
        docker {
            image 'node:bookworm-slim' 
            args '-p 3000:3000'
        }
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube analysis') {
            environment {
                SONARQUBE_VERSION = '5.0.1.3006'
            }  
            steps {
                script {
                    scannerHome = tool 'SonarQube Scanner 5.0'
                }
                withSonarQubeEnv('crisp-sonarqube') {
                    sh "${scannerHome}/sonar-scanner-${SONARQUBE_VERSION}-linux/bin/sonar-scanner"
                }
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Frontend tests') {
            steps {
                dir(path: 'multi-git-dashboard') {
                    sh 'npm install'
                    sh 'echo running frontend tests'
                }
            }
        }

        stage('Backend Tests') {
            steps {
                dir(path: 'backend') {
                    sh 'npm install'
                    sh 'npm test'
                }
            }
        }

        stage('Deliver') {
            steps {
                sh 'echo npm run build'
            }
        }
    }
}

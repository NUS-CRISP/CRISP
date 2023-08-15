pipeline {
	agent any

	stages {
		stage('Checkout') {
			steps {
				checkout scm
			}
		}
        stage('Frontend tests') {
            steps {
                dir('multi-git-dashboard') {
                    sh 'npm install'
                    sh 'echo running frontend tests'
                }
            }
        }
        stage('Backend Tests') {
            steps {
                dir('backend') {
                    sh 'npm install'
                    sh 'npm test'
                }
            }
        }
	}
}
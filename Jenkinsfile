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
        stage('Server Tests') {
            steps {
                dir('server') {
                    sh 'npm install'
                    sh 'npm test'
                }
            }
        }
	}
}
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

  }
}
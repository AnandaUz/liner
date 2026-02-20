pipeline {
    agent any

    parameters {
        string(name: 'GIT_REPO_URL', defaultValue: 'https://github.com/AnandaUz/liner.git', description: 'URL вашего публичного репозитория')
        string(name: 'APP_KEY', defaultValue: 'wtlg', description: 'Ключ вашего сервиса (APP_KEY)')
    }

    environment {
        // Контейнер будет называться по имени проекта
        IMAGE_NAME = "liner-app"
    }

    stages {
        stage('Cloning Git') {
            steps {
                // Поскольку репо публичный, credentialsId можно не указывать или оставить пустым
                checkout scmGit(
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[url: "${params.GIT_REPO_URL}"]]
                )
            }
        }

        // Этап тестов (пропускаем, так как в package.json нет тестов, кроме дефолтной ошибки)
        /*
        stage('Test') {
            steps {
                sh 'npm install'
                sh 'npm test'
            }
        }
        */

        stage('Delete older container') {
            steps {
                script {
                    // Останавливаем и удаляем старый контейнер, если он есть
                    sh "docker stop ${IMAGE_NAME} || true && docker rm ${IMAGE_NAME} --force || true"
                    sh "docker rmi ${IMAGE_NAME} || true"
                }
            }
        }

        stage('Building image') {
            steps {
                script {
                    // Собираем образ из нашего нового Dockerfile
                    sh "docker build . -t ${IMAGE_NAME}"
                }
            }
        }

        stage('Docker Run') {
            steps {
                script {
                    // Запуск с пробросом порта 3030 и сетью (если сеть wt-network существует в Jenkins)
                    // Добавляем параметр APP_KEY в окружение при запуске
                    sh "docker run --restart on-failure -p 2000:2000 -e APP_KEY=${params.APP_KEY} -d --name ${IMAGE_NAME} ${IMAGE_NAME}"
                }
            }
        }
    }
}

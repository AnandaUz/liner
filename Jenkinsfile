pipeline {
    agent any


    parameters {
            string(name: 'GIT_REPO_URL', defaultValue: 'https://github.com/AnandaUz/liner.git', description: 'URL репозитория')

            // Telegram Bot
            password(name: 'LINER_BOT_TOKEN', defaultValue: '', description: 'Токен телеграм бота (из BotFather)')
            string(name: 'LINER_BOT_USERNAME', defaultValue: '', description: 'Username вашего бота')
            string(name: 'LINER_BOT_ADMIN', defaultValue: '', description: 'ID администратора бота')

            // MongoDB
            string(name: 'MONGODB_USER', defaultValue: '', description: 'Пользователь базы данных')
            string(name: 'MONGODB_DB', defaultValue: '', description: 'Имя базы данных')
            password(name: 'MONGODB_PASSWORD', defaultValue: '', description: 'Пароль от пользователя БД')
            password(name: 'MONGODB_URI', defaultValue: '', description: 'Полная строка подключения (если используется)')

            // Google Auth & JWT
            string(name: 'GOOGLE_CLIENT_ID', defaultValue: '', description: 'Google Client ID')
            password(name: 'GOOGLE_CLIENT_SECRET', defaultValue: '', description: 'Google Client Secret')
            password(name: 'JWT_SECRET', defaultValue: '', description: 'Секретный ключ для JWT токенов')

            string(name: 'APP_KEY', defaultValue: 'wtlg', description: 'Ключ приложения')
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
                            // Запуск контейнера с пробросом всех переменных из параметров Jenkins
                            sh """
                            docker run -d \
                                --restart always \
                                -p 2000:2000 \
                                --name ${IMAGE_NAME} \
                                -e PORT=2000 \
                                -e APP_KEY='${params.APP_KEY}' \
                                -e LINER_BOT_TOKEN='${params.LINER_BOT_TOKEN}' \
                                -e LINER_BOT_USERNAME='${params.LINER_BOT_USERNAME}' \
                                -e LINER_BOT_ADMIN='${params.LINER_BOT_ADMIN}' \
                                -e MONGODB_USER='${params.MONGODB_USER}' \
                                -e MONGODB_DB='${params.MONGODB_DB}' \
                                -e MONGODB_PASSWORD='${params.MONGODB_PASSWORD}' \
                                -e MONGODB_URI='${params.MONGODB_URI}' \
                                -e GOOGLE_CLIENT_ID='${params.GOOGLE_CLIENT_ID}' \
                                -e GOOGLE_CLIENT_SECRET='${params.GOOGLE_CLIENT_SECRET}' \
                                -e JWT_SECRET='${params.JWT_SECRET}' \
                                ${IMAGE_NAME}
                            """
                        }
                    }
                }

                stage('Check Logs') {
                    steps {
                        script {
                            // Ожидание старта и вывод логов для проверки подключения к БД
                            sleep 10
                            sh "docker logs ${IMAGE_NAME}"
                        }
                    }
                }
    }
}

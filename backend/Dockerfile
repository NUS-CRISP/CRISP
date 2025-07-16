FROM node:alpine

WORKDIR /app

# Specify Timezone
ENV TZ=Asia/Singapore
RUN apk add --no-cache tzdata && \
    ln -sf /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

# Install dependencies for Gradle, Maven, and your app
RUN apk add --no-cache \
    git \
    openjdk17 \
    bash \
    curl \
    tar \
    unzip

# Install Maven
ENV MAVEN_VERSION=3.9.4
RUN curl -fsSL https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz \
    | tar -xzC /opt \
    && ln -s /opt/apache-maven-${MAVEN_VERSION} /opt/maven \
    && ln -s /opt/maven/bin/mvn /usr/bin/mvn

# Install Gradle
ENV GRADLE_VERSION=8.4
RUN curl -fsSL https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip \
    -o gradle.zip \
    && unzip gradle.zip -d /opt \
    && ln -s /opt/gradle-${GRADLE_VERSION} /opt/gradle \
    && ln -s /opt/gradle/bin/gradle /usr/bin/gradle \
    && rm gradle.zip

RUN npm install --global pnpm pm2

COPY ./backend/package*.json ./backend/

WORKDIR /app/backend

RUN pnpm install

WORKDIR /app

# Copy backend and shared folder
COPY ./backend/ ./backend/
COPY ./shared/ ./shared/

# Copy SonarScanner and configure it
COPY ./backend/sonar-scanner /app/sonar-scanner
RUN sed -i 's/use_embedded_jre=true/use_embedded_jre=false/' /app/sonar-scanner/sonar-scanner-6.2.1.4610-linux-x64/bin/sonar-scanner
ENV SONAR_PATH=/app/sonar-scanner/sonar-scanner-6.2.1.4610-linux-x64/bin/sonar-scanner
ENV PATH="/app/sonar-scanner/sonar-scanner-6.2.1.4610-linux-x64/bin:$PATH"

WORKDIR /app/backend

RUN pnpm run build

EXPOSE 3001

CMD [ "pm2-runtime", "pnpm", "--", "start" ]

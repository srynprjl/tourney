FROM golang:1.25-alpine

WORKDIR /app
 
ENV GOPROXY=https://proxy.golang.org,direct

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o main .

EXPOSE 8083

CMD ["./main"]

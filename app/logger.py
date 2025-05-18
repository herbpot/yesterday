class Logger:
    def __init__(self):
        self.fn = "yesterday.log"

    def info(self, message):
        with open(self.fn, "a") as f:
            f.write(f"{message}\n")

logger = Logger()

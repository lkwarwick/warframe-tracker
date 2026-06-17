from PySide6.QtCore import QObject
from PySide6.QtNetwork import QNetworkAccessManager, QNetworkRequest


class ImageLoader(QObject):
    def __init__(self):
        super().__init__()
        self.manager = QNetworkAccessManager(self)

        self.cache: dict[str, bytes] = {}

    def fetch(self, uid: str, url: str, callback):
        if uid in self.cache:
            callback(uid, self.cache[uid])
            return

        reply = self.manager.get(QNetworkRequest(url))

        reply.finished.connect(lambda r=reply: self._done(uid, r, callback))

    def _done(self, uid, reply, callback):
        err = reply.error()
        err_str = reply.errorString()

        if err != reply.NetworkError.NoError:
            print("IMAGE ERROR:", uid, err, err_str)
            reply.deleteLater()
            return

        data = reply.readAll().data()
        reply.deleteLater()

        self.cache[uid] = data

        callback(uid, data)
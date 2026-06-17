from PySide6.QtCore import QObject
from PySide6.QtNetwork import QNetworkAccessManager, QNetworkRequest


class ImageLoader(QObject):
    def __init__(self):
        super().__init__()
        self.manager = QNetworkAccessManager(self)

    def fetch(self, uid: str, url: str, callback):
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

        callback(uid, data)
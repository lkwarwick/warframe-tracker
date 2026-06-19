"""Contains the ImageLoader class."""
from typing import TYPE_CHECKING

from loguru import logger
from PySide6.QtCore import QObject
from PySide6.QtNetwork import QNetworkAccessManager, QNetworkReply, QNetworkRequest

if TYPE_CHECKING:
    from collections.abc import Callable


class ImageLoader(QObject):
    """Handles async requests for dowmloading remote images."""

    def __init__(self) -> None:
        super().__init__()
        self.manager = QNetworkAccessManager(self)

        self.cache: dict[str, bytes] = {}

    def fetch(self, uid: str, url: str, callback: Callable[[str, bytes], None]) -> None:
        """Either grab an from the cache, or perform the network request.

        Image is *not* returned, instead the callback in invoked with it.
        """
        if uid in self.cache:
            callback(uid, self.cache[uid])
            return

        reply = self.manager.get(QNetworkRequest(url))

        reply.finished.connect(lambda r=reply: self._done(uid, r, callback))

    def _done(self, uid: str, reply: QNetworkReply, callback: Callable[[str, bytes], None]) -> None:
        err = reply.error()
        err_str = reply.errorString()

        if err != reply.NetworkError.NoError:
            logger.error("IMAGE ERROR:", uid, err, err_str)
            reply.deleteLater()
            return

        data = bytes(reply.readAll().data())
        reply.deleteLater()

        self.cache[uid] = data

        callback(uid, data)

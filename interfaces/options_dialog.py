from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel,
    QSpinBox, QCheckBox
)

class OptionsDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Options")
        self.layout = QVBoxLayout(self)

        # Scramble length controls
        self.horizontal_layout = QHBoxLayout()
        self.label_scramble_length = QLabel('Set scramble length:', self)
        self.horizontal_layout.addWidget(self.label_scramble_length)

        self.spinBox_scramble_length = QSpinBox(self)
        self.spinBox_scramble_length.setMinimum(10)
        self.spinBox_scramble_length.setMaximum(30)
        self.spinBox_scramble_length.setValue(20)
        self.horizontal_layout.addWidget(self.spinBox_scramble_length)

        self.layout.addLayout(self.horizontal_layout)

        # Checkboxes
        self.checkBox_showTimes = QCheckBox('Show times', self)
        self.layout.addWidget(self.checkBox_showTimes)

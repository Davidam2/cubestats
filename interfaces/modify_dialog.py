from PyQt6.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel,
                             QLineEdit, QPushButton, QTableWidgetItem)

class ModifyDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Modify Time")
        self.layout = QVBoxLayout(self)
        self.label = QLabel("Solve to modify:", self)
        self.layout.addWidget(self.label)
        self.line_edit = QLineEdit(self)
        self.layout.addWidget(self.line_edit)

        # Buttons layout
        self.button_layout = QHBoxLayout()
        self.plus2_button = QPushButton("+2", self)
        self.plus2_button.clicked.connect(self.modify_time)
        self.button_layout.addWidget(self.plus2_button)
        self.dnf_button = QPushButton("DNF", self)
        self.dnf_button.clicked.connect(self.modify_time)
        self.button_layout.addWidget(self.dnf_button)
        self.remove_button = QPushButton('Remove', self)
        self.remove_button.clicked.connect(self.modify_time)
        self.button_layout.addWidget(self.remove_button)
        self.layout.addLayout(self.button_layout)

        # Set up database connection
        self.db_connection = self.parent().db_connection
        self.cursor = self.db_connection.cursor()
        self.table = self.parent().table_previous_times

    def modify_time(self):
        'Modify chosen solve time'
        solve_num = self.line_edit.text()
        modification = self.sender().text()
        if not solve_num.isdigit():
            self.parent().statusBar().showMessage('Invalid solve number')
            return

        index = int(solve_num) - 1
        if index < 0 or index >= self.table.rowCount():
            self.parent().statusBar().showMessage('Invalid solve number (out of range)')
            return

        solve_id = int(self.table.item(index, 0).text())
        if modification == '+2':
            current_time = self.table.item(index, 1).text()
            if current_time != 'DNF':
                new_time = round(float(current_time) + 2, 3)
                self.table.setItem(index, 1, QTableWidgetItem(str(new_time)))
                self.cursor.execute(
                    "UPDATE solves SET time = ? WHERE id = ?",
                    (new_time, solve_id))
                
        elif modification == 'DNF':
            self.table.setItem(index, 1, QTableWidgetItem('DNF'))
            self.cursor.execute(
                "UPDATE solves SET time = 'DNF' WHERE id = ?", (solve_id,))

        elif modification == 'Remove':
            self.table.removeRow(index)
            self.cursor.execute(
                "DELETE FROM solves WHERE id = ?", (solve_id,))
        
        
        # Commit the changes and update the table
        self.db_connection.commit()
        self.parent().table_previous_times.setRowCount(0)
        self.parent().load_saved_solves()
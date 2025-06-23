from db import db
from flask_login import UserMixin
from datetime import datetime, timezone

class Usuario(UserMixin, db.Model):
    __tablename__ = 'usuarios'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    senha = db.Column(db.String(128), nullable=False)
    
class Tarefa(db.Model):
    __tablename__ = 'tarefas'

    id = db.Column(db.Integer, primary_key=True)
    texto = db.Column(db.String(200))
    prioridade = db.Column(db.String(20))
    categoria = db.Column(db.String(50))
    concluida = db.Column(db.Boolean, default=False)
    criada_em = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id')) 

    def to_dict(self):
        return {
            'id': self.id,
            'texto': self.texto,
            'prioridade': self.prioridade,
            'categoria': self.categoria,
            'concluida': self.concluida,
            "criada_em": self.criada_em.isoformat() if self.criada_em else None,
        }
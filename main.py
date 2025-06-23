from flask import Flask, render_template, request, redirect, url_for, jsonify, abort
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from db import db
from models import Usuario, Tarefa
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'turatti'
app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///database.db"
db.init_app(app)

lm = LoginManager(app)
lm.login_view = 'login'

@lm.user_loader
def user_loader(user_id):
    return db.session.get(Usuario, int(user_id))

# Rotas para autenticação

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('index.html')
    email = request.form['email']
    senha = request.form['senha']
    user = Usuario.query.filter_by(email=email).first()
    if user and check_password_hash(user.senha, senha):
        login_user(user)
        return redirect(url_for('home'))
    return 'Email ou senha incorreto', 401

@app.route('/registrar', methods=['GET', 'POST'])
def registrar():
    if request.method == 'GET':
        return render_template('registro.html')
    nome = request.form['nome']
    email = request.form['email']
    senha = request.form['senha']
    # Verificar se email já existe
    if Usuario.query.filter_by(email=email).first():
        return 'Email já cadastrado', 400
    hashed_senha = generate_password_hash(senha)
    novo_usuario = Usuario(name=nome, email=email, senha=hashed_senha)
    db.session.add(novo_usuario)
    db.session.commit()
    login_user(novo_usuario)
    return redirect(url_for('home'))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# Página principal (tarefas)

@app.route('/')
@login_required
def home():
    return render_template('tarefas.html')

# API REST para tarefas

@app.route('/api/tarefas', methods=['GET'])
@login_required
def listar_tarefas():
    tarefas = Tarefa.query.filter_by(usuario_id=current_user.id).all()
    return jsonify([t.to_dict() for t in tarefas])


@app.route('/api/tarefas/<int:id>', methods=['PUT'])
@login_required
def atualizar_tarefa(id):
    tarefa = Tarefa.query.get_or_404(id)
    if tarefa.usuario_id != current_user.id:
        abort(403)
    data = request.json
    tarefa.texto = data.get('texto', tarefa.texto)
    tarefa.prioridade = data.get('prioridade', tarefa.prioridade)
    tarefa.categoria = data.get('categoria', tarefa.categoria)
    tarefa.concluida = data.get('concluida', tarefa.concluida)
    db.session.commit()
    return jsonify(tarefa.to_dict())

@app.route('/api/tarefas/<int:id>', methods=['DELETE'])
@login_required
def deletar_tarefa(id):
    tarefa = Tarefa.query.get_or_404(id)
    if tarefa.usuario_id != current_user.id:
        abort(403)
    db.session.delete(tarefa)
    db.session.commit()
    return '', 204

@app.route('/api/tarefas', methods=['POST'])
@login_required
def criar_tarefa_api():
    data = request.get_json()
    if not data or 'texto' not in data:
        return jsonify({'erro': 'Dados inválidos'}), 400

    texto = data['texto']
    prioridade = data.get('prioridade', 'media')
    categoria = data.get('categoria', 'Geral')

    if categoria == "Personalizada":
        categoria = data.get("categoriaPersonalizada", "Personalizada")

    nova = Tarefa(
        texto=texto,
        prioridade=prioridade,
        categoria=categoria,
        usuario_id=current_user.id
    )
    db.session.add(nova)
    db.session.commit()

    return jsonify(nova.to_dict()), 201

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
